"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { arenaApi } from '../../lib/arena';
import {
  learningRequest,
  type LearningPost,
  type LearningReply,
  type ChatStatus,
  type ReactionItem
} from '../../lib/learning';
import { useLearningPage } from './useLearningPage';
import s from './CommunityChat.module.css';

const EMOJI_OPTIONS = ['👍', '💡', '❤️', '🔥', '👏', '❓'];

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return 'Just now';
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function CommunityPage() {
  const { user } = useAuth();
  const [view, navigate] = useLearningPage('thread');
  const [posts, setPosts] = useState<LearningPost[]>([]);
  const [thread, setThread] = useState<{ post: LearningPost; replies: LearningReply[] } | null>(null);
  const [chatStatus, setChatStatus] = useState<ChatStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [online, setOnline] = useState<number | null>(null);

  // Filters & Composer states
  const [channel, setChannel] = useState<'all' | 'general' | 'question' | 'tip' | 'challenge' | 'pinned'>('all');
  const [search, setSearch] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerCategory, setComposerCategory] = useState<'general' | 'question' | 'tip' | 'challenge'>('general');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [challengeCode, setChallengeCode] = useState('');
  const [replyText, setReplyText] = useState('');
  const [more, setMore] = useState(true);

  const lockRef = useRef(false);
  const paginated = useRef(false);
  const staff = user?.role === 'teacher' || user?.role === 'operator';

  // Run async action with mutual exclusion and error tracking
  const run = async (fn: () => Promise<void>) => {
    if (lockRef.current) return;
    lockRef.current = true;
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to complete action.');
    } finally {
      lockRef.current = false;
      setBusy(false);
    }
  };

  // Fetch thread or feed
  const refresh = useCallback(async () => {
    try {
      const statusData = await learningRequest<ChatStatus>('/chat-status').catch(() => null);
      if (statusData) setChatStatus(statusData);

      if (view && view !== 'new') {
        const data = await learningRequest<{ post: LearningPost; replies: LearningReply[] }>(`/posts/${Number(view)}`);
        setThread(data);
      } else if (!view) {
        const data = await learningRequest<LearningPost[]>('/posts');
        setPosts(data);
        setMore(data.length === 40);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update community feed.');
    }
  }, [view]);

  // Initial load and periodic background poll
  useEffect(() => {
    if (!user) return;
    let alive = true;
    paginated.current = false;
    setError('');
    setLoading(true);

    const loadData = async () => {
      try {
        const [statusData, contentData] = await Promise.all([
          learningRequest<ChatStatus>('/chat-status').catch(() => null),
          view && view !== 'new'
            ? learningRequest<{ post: LearningPost; replies: LearningReply[] }>(`/posts/${Number(view)}`)
            : learningRequest<LearningPost[]>('/posts')
        ]);

        if (alive) {
          if (statusData) setChatStatus(statusData);
          if (view && view !== 'new') {
            setThread(contentData as { post: LearningPost; replies: LearningReply[] });
          } else {
            setPosts(contentData as LearningPost[]);
            setMore((contentData as LearningPost[]).length === 40);
          }
          setError('');
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Unable to connect to community.');
      } finally {
        if (alive) setLoading(false);
      }
    };

    void loadData();
    const interval = setInterval(() => {
      if (!document.hidden && !paginated.current) void loadData();
    }, 7000);

    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [view, user?.id]);

  // Online presence heartbeat
  useEffect(() => {
    if (!user) return;
    let alive = true;
    const heartbeat = () => {
      if (!document.hidden) {
        void learningRequest<{ count: number }>('/presence', {})
          .then(data => {
            if (alive) setOnline(data.count);
          })
          .catch(() => undefined);
      }
    };
    heartbeat();
    const interval = setInterval(heartbeat, 25000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [user?.id]);

  // Handle Emoji Reaction
  const handleReaction = async (targetType: 'post' | 'reply', targetId: number, emoji: string) => {
    void run(async () => {
      const payload = targetType === 'post' ? { post_id: targetId, emoji } : { reply_id: targetId, emoji };
      const res = await learningRequest<{ reactions: ReactionItem[] }>('/react', payload);

      if (targetType === 'post') {
        if (thread && thread.post.id === targetId) {
          setThread(t => t ? { ...t, post: { ...t.post, reactions: res.reactions } } : null);
        }
        setPosts(prev => prev.map(p => p.id === targetId ? { ...p, reactions: res.reactions } : p));
      } else {
        if (thread) {
          setThread(t => t ? {
            ...t,
            replies: t.replies.map(r => r.id === targetId ? { ...r, reactions: res.reactions } : r)
          } : null);
        }
      }
    });
  };

  // Staff: Toggle Chat Lock
  const handleToggleChatLock = () => {
    if (!staff) return;
    const nextLocked = !chatStatus?.is_locked;
    const reasonPrompt = nextLocked ? (window.prompt('Enter reason for pausing community chat (optional):', 'Study hours in effect') ?? '') : '';
    void run(async () => {
      const updated = await learningRequest<ChatStatus>('/chat-lock', { locked: nextLocked, reason: reasonPrompt });
      setChatStatus(updated);
    });
  };

  // Staff: Pin / Unpin Post
  const handleTogglePin = (postId: number) => {
    if (!staff) return;
    void run(async () => {
      await learningRequest(`/posts/${postId}/moderate`, { action: 'pin' });
      await refresh();
    });
  };

  // Staff: Verify / Unverify Teacher Solution
  const handleVerifyReply = (postId: number, replyId: number) => {
    if (!staff) return;
    void run(async () => {
      await learningRequest(`/posts/${postId}/moderate`, { action: 'verify-reply', reply_id: replyId });
      await refresh();
    });
  };

  // Post new community message/topic
  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const kind = composerCategory === 'challenge' ? 'challenge' : composerCategory === 'question' ? 'question' : 'discussion';
      const result = await learningRequest<{ post: LearningPost }>('/posts', {
        title,
        body,
        kind,
        category: composerCategory,
        challenge_code: composerCategory === 'challenge' ? challengeCode : undefined
      });
      setTitle('');
      setBody('');
      setChallengeCode('');
      setComposerOpen(false);
      navigate(String(result.post.id));
    });
  };

  // Submit comment / reply in thread
  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!thread) return;
    void run(async () => {
      const updated = await learningRequest<{ post: LearningPost; replies: LearningReply[] }>(
        `/posts/${thread.post.id}/replies`,
        { body: replyText }
      );
      setThread(updated);
      setReplyText('');
    });
  };

  // Filter posts based on active channel and search query
  const filteredPosts = posts.filter(p => {
    const matchesSearch = !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.body.toLowerCase().includes(search.toLowerCase()) ||
      p.author_name.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (channel === 'all') return true;
    if (channel === 'pinned') return p.pinned === 1;
    if (channel === 'question') return p.category === 'question' || p.kind === 'question';
    if (channel === 'tip') return p.category === 'tip';
    if (channel === 'challenge') return p.category === 'challenge' || p.kind === 'challenge';
    if (channel === 'general') return p.category === 'general' || p.kind === 'discussion';
    return true;
  });

  const pinnedPost = posts.find(p => p.pinned === 1);

  return (
    <section className={s.page}>
      {/* ─── Top Social Bar ─── */}
      <header className={s.topBar}>
        <div className={s.titleArea}>
          <div className={s.channelIcon}>💬</div>
          <div className={s.titleGroup}>
            <h1>
              School Community Chat
              {online !== null && (
                <span className={s.presencePill}>
                  <span className={s.presenceDot} />
                  {online} online
                </span>
              )}
            </h1>
          </div>
        </div>

        <div className={s.headerActions}>
          {staff && (
            <button
              type="button"
              className={`${s.btnLockToggle} ${chatStatus?.is_locked ? s.btnLockActive : ''}`}
              onClick={handleToggleChatLock}
              disabled={busy}
            >
              {chatStatus?.is_locked ? '🔓 Unlock Community Chat' : '🔒 Lock Chat (Staff)'}
            </button>
          )}

          {!view && !composerOpen && !chatStatus?.is_locked && (
            <button
              type="button"
              className={s.btnNewPost}
              onClick={() => setComposerOpen(true)}
            >
              ✍️ New Post or Question
            </button>
          )}

          {view && (
            <button
              type="button"
              className={s.threadBackBtn}
              onClick={() => navigate('')}
            >
              ← Back to Chat Feed
            </button>
          )}
        </div>
      </header>

      {/* ─── Lock Banner if Chat is Paused ─── */}
      {chatStatus?.is_locked && (
        <div className={s.lockBanner} role="alert">
          <div className={s.lockText}>
            <span>🔒 <strong>Community Chat is Locked</strong></span>
            {chatStatus.reason && <span className={s.lockReason}>— {chatStatus.reason}</span>}
            <span className={s.lockReason}>
              {staff ? '(Staff can still post official guidance)' : '(Read-only mode for students)'}
            </span>
          </div>
          {staff && (
            <button
              type="button"
              className={s.btnLockToggle}
              onClick={handleToggleChatLock}
              disabled={busy}
            >
              Unlock Now
            </button>
          )}
        </div>
      )}

      {/* ─── Error Notification ─── */}
      {error && (
        <div className={s.lockBanner} style={{ borderColor: '#fca5a5', background: '#fef2f2', color: '#991b1b' }}>
          <span>⚠️ {error}</span>
          <button type="button" className={s.btnActionText} onClick={() => void run(refresh)}>Retry</button>
        </div>
      )}

      {/* ─── THREAD VIEW ─── */}
      {view ? (
        loading && !thread ? (
          <p style={{ padding: '40px 0', textAlign: 'center', color: '#64748b' }}>Loading conversation…</p>
        ) : thread ? (
          <div className={s.threadContainer}>
            {/* Original Post in Thread */}
            <article className={`${s.chatCard} ${thread.post.pinned ? s.chatCardPinned : ''}`}>
              <div className={s.cardHeader}>
                <div className={s.authorBlock}>
                  <div className={`${s.avatarCircle} ${thread.post.author_role === 'teacher' ? s.avatarTeacher : thread.post.author_role === 'operator' ? s.avatarAdmin : s.avatarStudent}`}>
                    {getInitials(thread.post.author_name)}
                  </div>
                  <div className={s.authorMeta}>
                    <div className={s.authorNameLine}>
                      <span className={s.authorName}>{thread.post.author_name}</span>
                      {thread.post.author_grade && (
                        <span className={s.badgeGrade}>{thread.post.author_grade}</span>
                      )}
                      {thread.post.author_role === 'teacher' && (
                        <span className={s.badgeTeacher}>🎓 Teacher</span>
                      )}
                      {thread.post.author_role === 'operator' && (
                        <span className={s.badgeAdmin}>🛡️ Admin</span>
                      )}
                    </div>
                    <span className={s.timeMuted}>{formatRelativeTime(thread.post.created_at)}</span>
                  </div>
                </div>

                <div className={s.cardTags}>
                  {thread.post.category === 'tip' && <span className={`${s.tagPill} ${s.tagTip}`}>💡 Study Tip</span>}
                  {thread.post.category === 'question' && <span className={`${s.tagPill} ${s.tagQuestion}`}>❓ Question</span>}
                  {thread.post.category === 'challenge' && <span className={`${s.tagPill} ${s.tagChallenge}`}>⚔️ Challenge</span>}
                  {thread.post.resolved === 1 && <span className={`${s.tagPill} ${s.tagResolved}`}>✓ Solved</span>}
                  {thread.post.pinned === 1 && <span className={`${s.tagPill} ${s.tagTip}`}>📌 Pinned</span>}
                </div>
              </div>

              <h2 className={s.postTitle} style={{ cursor: 'default' }}>{thread.post.title}</h2>
              <div className={s.postContent}>{thread.post.body}</div>

              {thread.post.challenge_code && (
                <div className={s.challengeBanner}>
                  <div>
                    <span style={{ fontSize: 12, color: '#7e22ce', fontWeight: 600, display: 'block' }}>Practice Arena Challenge</span>
                    <span className={s.challengeCodeText}>{thread.post.challenge_code}</span>
                  </div>
                  {user?.role === 'student' && (
                    <button
                      type="button"
                      className={s.btnJoinChallenge}
                      disabled={busy}
                      onClick={() => void run(async () => {
                        await arenaApi.join(thread.post.challenge_code!);
                        window.location.href = '/student/practice/';
                      })}
                    >
                      ⚔️ Enter Match Arena
                    </button>
                  )}
                </div>
              )}

              {/* Reactions Bar on Main Post */}
              <div className={s.cardFooter}>
                <div className={s.reactionsGroup}>
                  {EMOJI_OPTIONS.map(emoji => {
                    const match = thread.post.reactions?.find(r => r.emoji === emoji);
                    const count = match?.count || 0;
                    const hasReacted = match?.has_reacted || false;
                    return (
                      <button
                        key={emoji}
                        type="button"
                        className={`${s.reactionBtn} ${hasReacted ? s.reactionActive : ''}`}
                        onClick={() => handleReaction('post', thread.post.id, emoji)}
                      >
                        {emoji} {count > 0 && <span>{count}</span>}
                      </button>
                    );
                  })}
                </div>

                <div className={s.footerActions}>
                  {(staff || user?.id === thread.post.author_id) && (
                    <button
                      type="button"
                      className={s.btnActionText}
                      disabled={busy}
                      onClick={() => void run(async () => {
                        await learningRequest(`/posts/${thread.post.id}/moderate`, { action: 'resolve' });
                        await refresh();
                      })}
                    >
                      {thread.post.resolved ? 'Reopen Question' : '✓ Mark Solved'}
                    </button>
                  )}
                  {staff && (
                    <>
                      <button
                        type="button"
                        className={s.btnActionText}
                        disabled={busy}
                        onClick={() => handleTogglePin(thread.post.id)}
                      >
                        {thread.post.pinned ? '📌 Unpin' : '📌 Pin to Top'}
                      </button>
                      <button
                        type="button"
                        className={s.btnActionText}
                        style={{ color: '#dc2626' }}
                        disabled={busy}
                        onClick={() => {
                          if (window.confirm('Delete this message from community?')) {
                            void run(async () => {
                              await learningRequest(`/posts/${thread.post.id}/moderate`, { action: 'hide' });
                              navigate('');
                            });
                          }
                        }}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </article>

            {/* Replies Stream */}
            <div className={s.repliesStream}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: '16px 0 8px', color: '#475569' }}>
                Comments & Answers ({thread.replies.length})
              </h3>

              {thread.replies.length === 0 && (
                <p style={{ color: '#94a3b8', fontSize: 13, padding: '12px 0' }}>
                  No comments yet. Be the first to answer or share an explanation!
                </p>
              )}

              {thread.replies.map(reply => {
                const isStaff = reply.author_role === 'teacher' || reply.author_role === 'operator';
                const isVerified = reply.is_staff_verified === 1 || isStaff;

                return (
                  <div
                    key={reply.id}
                    className={`${s.replyItem} ${isVerified ? s.verifiedReply : ''}`}
                  >
                    {isVerified && (
                      <div className={s.verifiedStaffHeader}>
                        ⭐ Official Staff Verified Solution
                      </div>
                    )}

                    <div className={s.cardHeader}>
                      <div className={s.authorBlock}>
                        <div className={`${s.avatarCircle} ${reply.author_role === 'teacher' ? s.avatarTeacher : reply.author_role === 'operator' ? s.avatarAdmin : s.avatarStudent}`} style={{ width: 32, height: 32, fontSize: 12 }}>
                          {getInitials(reply.author_name)}
                        </div>
                        <div className={s.authorMeta}>
                          <div className={s.authorNameLine}>
                            <span className={s.authorName} style={{ fontSize: 13 }}>{reply.author_name}</span>
                            {reply.author_grade && <span className={s.badgeGrade}>{reply.author_grade}</span>}
                            {reply.author_role === 'teacher' && <span className={s.badgeTeacher}>🎓 Teacher</span>}
                            {reply.author_role === 'operator' && <span className={s.badgeAdmin}>🛡️ Admin</span>}
                          </div>
                          <span className={s.timeMuted}>{formatRelativeTime(reply.created_at)}</span>
                        </div>
                      </div>

                      {staff && (
                        <div className={s.cardTags}>
                          <button
                            type="button"
                            className={s.btnActionText}
                            style={{ fontSize: 11 }}
                            onClick={() => handleVerifyReply(thread.post.id, reply.id)}
                          >
                            {reply.is_staff_verified ? 'Unverify' : '⭐ Verify Solution'}
                          </button>
                          <button
                            type="button"
                            className={s.btnActionText}
                            style={{ fontSize: 11, color: '#dc2626' }}
                            onClick={() => void run(async () => {
                              await learningRequest(`/posts/${thread.post.id}/moderate`, { action: 'hide-reply', reply_id: reply.id });
                              await refresh();
                            })}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>

                    <div className={s.postContent} style={{ marginBottom: 10, fontSize: 13.5 }}>
                      {reply.body}
                    </div>

                    {/* Reply Reactions */}
                    <div className={s.reactionsGroup} style={{ marginTop: 6 }}>
                      {EMOJI_OPTIONS.map(emoji => {
                        const match = reply.reactions?.find(r => r.emoji === emoji);
                        const count = match?.count || 0;
                        const hasReacted = match?.has_reacted || false;
                        return (
                          <button
                            key={emoji}
                            type="button"
                            className={`${s.reactionBtn} ${hasReacted ? s.reactionActive : ''}`}
                            style={{ padding: '2px 7px', fontSize: 11 }}
                            onClick={() => handleReaction('reply', reply.id, emoji)}
                          >
                            {emoji} {count > 0 && <span>{count}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reply Composer */}
            {chatStatus?.is_locked && !staff ? (
              <div className={s.composerLockedBanner} style={{ marginTop: 24 }}>
                🔒 New replies are currently paused while community chat is locked by School Administration.
              </div>
            ) : (
              <form className={s.composerBox} onSubmit={handleReplySubmit}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Drop an Answer or Comment:</span>
                  {staff && <span className={s.badgeTeacher}>Posting as Verified Staff</span>}
                </div>
                <textarea
                  required
                  maxLength={10000}
                  className={s.textareaField}
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Explain your approach, provide formulas, or encourage your peers..."
                />
                <div className={s.composerFooter}>
                  <span className={s.composerHint}>Keep explanations clear and respectful.</span>
                  <button type="submit" className={s.btnSubmit} disabled={busy || !replyText.trim()}>
                    Post Reply →
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : null
      ) : (
        /* ─── MAIN SOCIAL CHAT & CHANNELS FEED ─── */
        <>
          {/* Channel Tabs */}
          <nav className={s.channelNav} aria-label="Community Channels">
            <button
              type="button"
              className={`${s.channelPill} ${channel === 'all' ? s.channelActive : ''}`}
              onClick={() => setChannel('all')}
            >
              # all-channels
            </button>
            <button
              type="button"
              className={`${s.channelPill} ${channel === 'general' ? s.channelActive : ''}`}
              onClick={() => setChannel('general')}
            >
              💬 # general-chat
            </button>
            <button
              type="button"
              className={`${s.channelPill} ${channel === 'question' ? s.channelActive : ''}`}
              onClick={() => setChannel('question')}
            >
              ❓ # questions-help
            </button>
            <button
              type="button"
              className={`${s.channelPill} ${channel === 'tip' ? s.channelActive : ''}`}
              onClick={() => setChannel('tip')}
            >
              💡 # tips-resources
            </button>
            <button
              type="button"
              className={`${s.channelPill} ${channel === 'challenge' ? s.channelActive : ''}`}
              onClick={() => setChannel('challenge')}
            >
              ⚔️ # challenge-arena
            </button>
            <button
              type="button"
              className={`${s.channelPill} ${channel === 'pinned' ? s.channelActive : ''}`}
              onClick={() => setChannel('pinned')}
            >
              📌 # pinned
            </button>
          </nav>

          {/* Search Row */}
          <div className={s.searchRow}>
            <div className={s.searchBox}>
              <span className={s.searchIcon}>🔍</span>
              <input
                type="text"
                className={s.searchInput}
                placeholder="Search topics, questions, formulas, or author name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {!composerOpen && !chatStatus?.is_locked && (
              <button
                type="button"
                className={s.btnNewPost}
                onClick={() => setComposerOpen(true)}
              >
                + Drop a Question / Tip
              </button>
            )}
          </div>

          {/* Pinned Notice Card if not in pinned channel */}
          {channel !== 'pinned' && pinnedPost && (
            <div className={s.pinnedCard}>
              <div className={s.pinnedIconWrap}>📌</div>
              <div className={s.pinnedContent}>
                <span className={s.pinnedLabel}>Official Pinned Notice · {pinnedPost.author_name} ({pinnedPost.author_role})</span>
                <span className={s.pinnedTitle} onClick={() => navigate(String(pinnedPost.id))}>
                  {pinnedPost.title}
                </span>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#475569' }}>
                  {pinnedPost.body.length > 140 ? `${pinnedPost.body.slice(0, 140)}…` : pinnedPost.body}
                </p>
              </div>
            </div>
          )}

          {/* New Post Composer Card */}
          {composerOpen && (
            <form className={s.composerBox} onSubmit={handleCreatePost} style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Share with the School Community</span>
                <button type="button" className={s.btnActionText} onClick={() => setComposerOpen(false)}>✕ Cancel</button>
              </div>

              {/* Category Selector Tabs */}
              <div className={s.composerTabs}>
                <button
                  type="button"
                  className={`${s.composerTab} ${composerCategory === 'general' ? s.composerTabActive : ''}`}
                  onClick={() => setComposerCategory('general')}
                >
                  💬 General Discussion
                </button>
                <button
                  type="button"
                  className={`${s.composerTab} ${composerCategory === 'question' ? s.composerTabActive : ''}`}
                  onClick={() => setComposerCategory('question')}
                >
                  ❓ Problem / Question
                </button>
                <button
                  type="button"
                  className={`${s.composerTab} ${composerCategory === 'tip' ? s.composerTabActive : ''}`}
                  onClick={() => setComposerCategory('tip')}
                >
                  💡 Study Tip & Formula
                </button>
                <button
                  type="button"
                  className={`${s.composerTab} ${composerCategory === 'challenge' ? s.composerTabActive : ''}`}
                  onClick={() => setComposerCategory('challenge')}
                >
                  ⚔️ Arena Challenge Invite
                </button>
              </div>

              <input
                required
                maxLength={140}
                className={s.inputField}
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={
                  composerCategory === 'tip'
                    ? 'Tip title (e.g. Easy way to remember Trig ratios)'
                    : composerCategory === 'question'
                      ? 'What subject or problem are you stuck on?'
                      : composerCategory === 'challenge'
                        ? 'Challenge description (e.g. SS 2 Chemistry Speed Battle)'
                        : 'Topic title...'
                }
              />

              <textarea
                required
                maxLength={10000}
                className={s.textareaField}
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Explain what you are thinking, paste code or questions, or give advice..."
              />

              {composerCategory === 'challenge' && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#6b21a8', display: 'block', marginBottom: 4 }}>
                    Practice Arena 8-Character Room Code:
                  </label>
                  <input
                    required
                    maxLength={8}
                    className={s.inputField}
                    value={challengeCode}
                    onChange={e => setChallengeCode(e.target.value.toUpperCase())}
                    placeholder="e.g. ABCDEF12"
                    style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}
                  />
                </div>
              )}

              <div className={s.composerFooter}>
                <span className={s.composerHint}>Visible to all students, teachers, and school administrators.</span>
                <button type="submit" className={s.btnSubmit} disabled={busy || !title.trim() || !body.trim()}>
                  Post to Community →
                </button>
              </div>
            </form>
          )}

          {/* Social Message Feed */}
          {loading ? (
            <p style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>Loading community discussions…</p>
          ) : filteredPosts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', background: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: 32, display: 'block', marginBottom: 8 }}>💬</span>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 6px', color: '#1e293b' }}>
                {search ? 'No matching discussions found' : 'No posts in this channel yet'}
              </h3>
              <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 16px' }}>
                {search ? 'Try adjusting your search terms' : 'Be the first student or teacher to drop a tip or question!'}
              </p>
              {!chatStatus?.is_locked && (
                <button type="button" className={s.btnNewPost} onClick={() => setComposerOpen(true)}>
                  Start a Discussion
                </button>
              )}
            </div>
          ) : (
            <div className={s.chatStream}>
              {filteredPosts.map(post => (
                <article
                  key={post.id}
                  className={`${s.chatCard} ${post.pinned ? s.chatCardPinned : ''}`}
                >
                  <div className={s.cardHeader}>
                    <div className={s.authorBlock}>
                      <div className={`${s.avatarCircle} ${post.author_role === 'teacher' ? s.avatarTeacher : post.author_role === 'operator' ? s.avatarAdmin : s.avatarStudent}`}>
                        {getInitials(post.author_name)}
                      </div>
                      <div className={s.authorMeta}>
                        <div className={s.authorNameLine}>
                          <span className={s.authorName}>{post.author_name}</span>
                          {post.author_grade && <span className={s.badgeGrade}>{post.author_grade}</span>}
                          {post.author_role === 'teacher' && <span className={s.badgeTeacher}>🎓 Teacher</span>}
                          {post.author_role === 'operator' && <span className={s.badgeAdmin}>🛡️ Admin</span>}
                        </div>
                        <span className={s.timeMuted}>{formatRelativeTime(post.created_at)}</span>
                      </div>
                    </div>

                    <div className={s.cardTags}>
                      {post.category === 'tip' && <span className={`${s.tagPill} ${s.tagTip}`}>💡 Study Tip</span>}
                      {post.category === 'question' && <span className={`${s.tagPill} ${s.tagQuestion}`}>❓ Question</span>}
                      {post.category === 'challenge' && <span className={`${s.tagPill} ${s.tagChallenge}`}>⚔️ Challenge</span>}
                      {post.resolved === 1 && <span className={`${s.tagPill} ${s.tagResolved}`}>✓ Solved</span>}
                      {post.pinned === 1 && <span className={`${s.tagPill} ${s.tagTip}`}>📌 Pinned</span>}
                    </div>
                  </div>

                  <h3 className={s.postTitle} onClick={() => navigate(String(post.id))}>
                    {post.title}
                  </h3>
                  <div className={s.postContent}>
                    {post.body.length > 280 ? `${post.body.slice(0, 280)}…` : post.body}
                  </div>

                  {post.challenge_code && (
                    <div className={s.challengeBanner}>
                      <div>
                        <span style={{ fontSize: 11, color: '#7e22ce', fontWeight: 600 }}>Arena Challenge Code</span>
                        <div className={s.challengeCodeText}>{post.challenge_code}</div>
                      </div>
                      {user?.role === 'student' && (
                        <button
                          type="button"
                          className={s.btnJoinChallenge}
                          onClick={() => void run(async () => {
                            await arenaApi.join(post.challenge_code!);
                            window.location.href = '/student/practice/';
                          })}
                        >
                          ⚔️ Join Battle
                        </button>
                      )}
                    </div>
                  )}

                  {/* Card Footer with Reactions & Reply Counter */}
                  <div className={s.cardFooter}>
                    <div className={s.reactionsGroup}>
                      {EMOJI_OPTIONS.map(emoji => {
                        const match = post.reactions?.find(r => r.emoji === emoji);
                        const count = match?.count || 0;
                        const hasReacted = match?.has_reacted || false;
                        return (
                          <button
                            key={emoji}
                            type="button"
                            className={`${s.reactionBtn} ${hasReacted ? s.reactionActive : ''}`}
                            onClick={() => handleReaction('post', post.id, emoji)}
                          >
                            {emoji} {count > 0 && <span>{count}</span>}
                          </button>
                        );
                      })}
                    </div>

                    <div className={s.footerActions}>
                      <button
                        type="button"
                        className={s.replyCountBtn}
                        onClick={() => navigate(String(post.id))}
                      >
                        💬 {post.reply_count} {post.reply_count === 1 ? 'Reply' : 'Replies'}
                      </button>

                      {staff && (
                        <button
                          type="button"
                          className={s.btnActionText}
                          onClick={() => handleTogglePin(post.id)}
                        >
                          {post.pinned ? '📌 Unpin' : '📌 Pin'}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}

              {more && !loading && (
                <button
                  type="button"
                  style={{
                    padding: '12px 20px',
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#475569',
                    fontWeight: 600,
                    cursor: 'pointer',
                    margin: '10px auto',
                    display: 'block'
                  }}
                  disabled={busy}
                  onClick={() => void run(async () => {
                    const older = await learningRequest<LearningPost[]>(`/posts?before=${posts[posts.length - 1]?.id}`);
                    paginated.current = true;
                    setPosts(current => [...current, ...older]);
                    setMore(older.length === 40);
                  })}
                >
                  Load older messages
                </button>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
