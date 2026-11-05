import React, { useState } from 'react';
import {
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from 'react-native';
import { BaseAlert } from '../base-alert';
import { BaseAvatar } from '../base-avatar';
import { BaseButton } from '../base-button';
import { BaseDialog } from '../base-dialog';
import { BaseListGroup, BaseListRow } from '../base-list-row';
import { BaseSelect, type BaseSelectOption } from '../base-select';
import { BaseSkeletonText } from '../base-skeleton';
import { BaseSwitch } from '../base-switch';
import { BaseToggleGroup, type BaseToggleItem } from '../base-toggle-group';
import { useBaseTheme } from '../base-theme';
import {
  BlockFrame,
  BlockSection,
  BlockText,
  type BlockProps,
} from './BlockLayout';

const defaultCopy = {
  title: 'Settings',
  profile: 'Profile',
  editProfile: 'Edit profile',
  notifications: 'Notifications',
  push: 'Push notifications',
  pushDescription: 'Mentions, replies, and reminders.',
  email: 'Email updates',
  emailDescription: 'A weekly look at your workspace.',
  preferences: 'Preferences',
  language: 'Language',
  theme: 'Appearance',
  languagePlaceholder: 'Choose a language',
  danger: 'Danger zone',
  deleteAccount: 'Delete account',
  deleteDescription: 'Permanently remove your account and data.',
  deleteTitle: 'Delete your account?',
  deleteWarning:
    'Your workspace and all of its data will be permanently deleted. This cannot be undone.',
  cancel: 'Keep account',
  confirm: 'Delete account',
  close: 'Close confirmation',
  errorTitle: 'Could not update settings',
  version: 'Northwind · Version 1.0.0',
  loading: 'Loading settings',
  back: 'Back',
};
export type SettingsValues = {
  push: boolean;
  email: boolean;
  language: string;
  appearance: string;
};
export type SettingsProfile = {
  name: string;
  email: string;
  initials: string;
  avatar?: ImageSourcePropType;
};
export type BaseSettingsBlockProps = BlockProps & {
  /** ACQAD: render school-backed notification categories and omit unavailable settings. */
  notificationContent?: React.ReactNode;
  showPreferences?: boolean;
  showDanger?: boolean;
  /** All screen copy and accessible labels. */
  copy?: Partial<typeof defaultCopy>;
  /** Host-owned profile data. */
  profile?: SettingsProfile;
  /** Controlled preference values. */
  values?: SettingsValues;
  /** Initial preferences when uncontrolled. */
  defaultValues?: Partial<SettingsValues>;
  /** Receives the full next preferences; the host applies theme/persistence. */
  onValuesChange?: (values: SettingsValues) => void;
  /** Language choices. */
  languages?: BaseSelectOption[];
  /** Appearance choices. Values are caller-owned. */
  appearances?: BaseToggleItem[];
  /** Optional section/row icons. */
  icons?: {
    push?: React.ReactNode;
    email?: React.ReactNode;
    language?: React.ReactNode;
    danger?: React.ReactNode;
  };
  /** Opens the host profile editor. */
  onEditProfile?: () => void;
  /** Controlled destructive confirmation state. */
  deleteOpen?: boolean;
  /** Reports confirmation open changes. */
  onDeleteOpenChange?: (open: boolean) => void;
  /** Called only after explicit destructive confirmation. */
  onDeleteAccount?: () => void;
  /** Keeps the destructive dialog busy until the host finishes. */
  deleting?: boolean;
  /** Host-controlled deletion error, shown inside the dialog. */
  deleteError?: string;
};
const defaultLanguages: BaseSelectOption[] = [
  { value: 'en', label: 'English (US)' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
];
const defaultAppearances: BaseToggleItem[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

export function BaseSettingsBlock({
  notificationContent,
  showPreferences = true,
  showDanger = true,
  copy,
  profile = { name: 'Alex Morgan', email: 'alex@example.com', initials: 'AM' },
  values: controlled,
  defaultValues,
  onValuesChange,
  languages = defaultLanguages,
  appearances = defaultAppearances,
  icons,
  onEditProfile,
  deleteOpen: controlledDelete,
  onDeleteOpenChange,
  onDeleteAccount,
  deleting = false,
  deleteError,
  loading = false,
  error,
  ...props
}: BaseSettingsBlockProps) {
  const theme = useBaseTheme(props.theme);
  const t = { ...defaultCopy, ...copy };
  // Narrow phones (320 pt) keep the row title readable; wider screens fit the full language name.
  const selectWidth = useWindowDimensions().width < 360 ? 96 : 152;
  const [internal, setInternal] = useState<SettingsValues>({
    push: true,
    email: false,
    language: languages[0]?.value ?? '',
    appearance: 'system',
    ...defaultValues,
  });
  const values = controlled ?? internal;
  const [localDelete, setLocalDelete] = useState(false);
  const deleteOpen = controlledDelete ?? localDelete;
  const setDeleteOpen = (next: boolean) => {
    if (deleting) return;
    if (controlledDelete === undefined) setLocalDelete(next);
    onDeleteOpenChange?.(next);
  };
  const update = (patch: Partial<SettingsValues>) => {
    const next = { ...values, ...patch };
    if (controlled === undefined) setInternal(next);
    onValuesChange?.(next);
  };
  return (
    <BlockFrame
      {...props}
      theme={theme}
      title={t.title}
      largeTitle
      backLabel={props.backLabel ?? t.back}
    >
      {error ? (
        <BaseAlert
          variant="destructive"
          title={t.errorTitle}
          description={error}
        />
      ) : null}
      {loading ? (
        <View
          accessible
          accessibilityLabel={t.loading}
          accessibilityState={{ busy: true }}
          aria-busy={true}
        >
          <BaseSkeletonText lines={8} />
        </View>
      ) : (
        <>
          <BlockSection title={t.profile}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.space[4],
              }}
            >
              <BaseAvatar
                fallback={profile.initials}
                source={profile.avatar}
                size="lg"
                accessibilityLabel={profile.name}
              />
              <View style={{ flex: 1, minWidth: 0, gap: theme.space[1] }}>
                <BlockText medium>{profile.name}</BlockText>
                <BlockText muted>{profile.email}</BlockText>
              </View>
            </View>
            {onEditProfile && <BaseButton
              variant="outline"
              fullWidth
              onPress={onEditProfile}
              style={{ minHeight: 48 }}
            >
              {t.editProfile}
            </BaseButton>}
          </BlockSection>
          <BlockSection index={1} title={t.notifications}>
            {notificationContent ?? <BaseListGroup inset>
              <BaseListRow
                title={t.push}
                description={t.pushDescription}
                leading={icons?.push}
                trailing={
                  <BaseSwitch
                    value={values.push}
                    onValueChange={(push) => update({ push })}
                    accessibilityLabel={t.push}
                    testID={`${props.testID ?? 'base-settings-block'}-push`}
                  />
                }
              />
              <BaseListRow
                title={t.email}
                description={t.emailDescription}
                leading={icons?.email}
                trailing={
                  <BaseSwitch
                    value={values.email}
                    onValueChange={(email) => update({ email })}
                    accessibilityLabel={t.email}
                  />
                }
              />
            </BaseListGroup>}
          </BlockSection>
          {showPreferences && <BlockSection index={2} title={t.preferences}>
            <BaseListGroup inset>
              <BaseListRow
                title={t.language}
                leading={icons?.language}
                trailing={
                  <BaseSelect
                    value={values.language}
                    options={languages}
                    onValueChange={(language) => update({ language })}
                    accessibilityLabel={t.language}
                    placeholder={t.languagePlaceholder}
                    style={{ width: selectWidth }}
                  />
                }
              />
            </BaseListGroup>
            <BlockText muted medium>
              {t.theme}
            </BlockText>
            <BaseToggleGroup
              value={values.appearance}
              items={appearances}
              onValueChange={(appearance) => {
                if (appearance) update({ appearance });
              }}
              accessibilityLabel={t.theme}
            />
          </BlockSection>}
          {showDanger && <BlockSection index={3} title={t.danger}>
            <BaseListRow
              title={t.deleteAccount}
              description={t.deleteDescription}
              leading={icons?.danger}
              variant="outline"
            />
            <BaseButton
              fullWidth
              variant="destructive"
              onPress={() => setDeleteOpen(true)}
              testID={props.testID ?? 'base-settings-block'}
              style={{ minHeight: 48 }}
            >
              {t.deleteAccount}
            </BaseButton>
          </BlockSection>}
        </>
      )}
      <BlockText muted style={{ textAlign: 'center' }}>
        {t.version}
      </BlockText>
      <BaseDialog
        visible={deleteOpen}
        onVisibleChange={setDeleteOpen}
        title={t.deleteTitle}
        description={t.deleteWarning}
        role="alertdialog"
        dismissible={!deleting}
        closeLabel={t.close}
        theme={theme}
        footer={
          <>
            <BaseButton
              variant="outline"
              disabled={deleting}
              onPress={() => setDeleteOpen(false)}
              style={{ minHeight: 48 }}
            >
              {t.cancel}
            </BaseButton>
            <BaseButton
              variant="destructive"
              loading={deleting}
              onPress={onDeleteAccount}
              style={{ minHeight: 48 }}
            >
              {t.confirm}
            </BaseButton>
          </>
        }
      >
        {deleteError ? (
          <BaseAlert
            variant="destructive"
            title={t.errorTitle}
            description={deleteError}
          />
        ) : null}
      </BaseDialog>
    </BlockFrame>
  );
}
export default BaseSettingsBlock;
