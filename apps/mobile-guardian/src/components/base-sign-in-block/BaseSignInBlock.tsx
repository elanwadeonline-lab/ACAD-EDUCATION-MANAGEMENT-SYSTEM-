import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { BaseAlert } from '../base-alert';
import { BaseButton } from '../base-button';
import { BaseCheckbox } from '../base-checkbox';
import { BaseInput } from '../base-input';
import { BaseInputOTP } from '../base-input-otp';
import { BaseSeparator } from '../base-separator';
import { useBaseTheme } from '../base-theme';
import {
  BlockFrame,
  BlockSection,
  BlockText,
  type BlockProps,
} from './BlockLayout';

const defaultCopy = {
  title: 'Northwind',
  heading: 'Welcome back',
  description: 'Sign in to your workspace and pick up where you left off.',
  email: 'Email',
  emailPlaceholder: 'you@example.com',
  password: 'Password',
  passwordPlaceholder: 'Enter your password',
  remember: 'Remember me',
  forgot: 'Forgot password?',
  submit: 'Sign in',
  separator: 'or',
  registerHint: 'New to Northwind?',
  register: 'Create an account',
  verifyHeading: 'Check your inbox',
  verifyDescription: 'Enter the six-digit code sent to your email.',
  code: 'Verification code',
  verify: 'Verify email',
  resend: 'Resend code',
  resendCountdown: 'Resend in {seconds}s',
  changeEmail: 'Use another email',
  errorTitle: 'Unable to sign in',
  invalidEmail: 'Enter a valid email address.',
  invalidPassword: 'Use at least 8 characters.',
  invalidCode: 'Enter all six digits.',
  showPassword: 'Show password',
  hidePassword: 'Hide password',
  back: 'Back',
};
export type SignInValues = {
  email: string;
  password: string;
  remember: boolean;
};
export type SignInProvider = {
  id: string;
  label: string;
  icon?: React.ReactNode;
};
export type SignInStep = 'credentials' | 'verification';
export type BaseSignInBlockProps = BlockProps & {
  /** ACQAD integration: school connection field and canonical identity. */
  formAccessory?: React.ReactNode;
  brand?: React.ReactNode;
  showRemember?: boolean;
  /** Every visible and accessible string, including validation messages. */
  copy?: Partial<typeof defaultCopy>;
  /** Controlled form values. */
  values?: SignInValues;
  /** Initial values when uncontrolled. */
  defaultValues?: Partial<SignInValues>;
  /** Receives form edits. Never persists credentials. */
  onValuesChange?: (values: SignInValues) => void;
  /** Host decides whether successful sign-in requires verification. */
  onSubmit?: (values: SignInValues) => void;
  /** Controlled step; defaults to credentials. */
  step?: SignInStep;
  /** Requests returning to credentials. */
  onStepChange?: (step: SignInStep) => void;
  /** Controlled or initial verification code. */
  code?: string;
  /** Reports code changes. */
  onCodeChange?: (code: string) => void;
  /** Submits a complete code. */
  onVerify?: (code: string) => void;
  /** Called when a new code is requested. */
  onResend?: () => void;
  /** Cooldown in seconds, started on entering verification and resending. */
  resendSeconds?: number;
  /** Minimum credential length, or supply validate for your own policy. */
  minimumPasswordLength?: number;
  /** Optional validation policy, returning field-specific messages. */
  validate?: (values: SignInValues) => { email?: string; password?: string };
  /** Caller-owned provider labels and icons. An empty array hides providers. */
  providers?: SignInProvider[];
  /** Provider selection callback. */
  onProvider?: (id: string) => void;
  /** Host handles password recovery. */
  onForgotPassword?: () => void;
  /** Host handles registration. */
  onRegister?: () => void;
};
const defaultProviders: SignInProvider[] = [
  { id: 'work', label: 'Continue with work account' },
  { id: 'personal', label: 'Continue with personal account' },
];

export function BaseSignInBlock({
  formAccessory,
  brand,
  showRemember = true,
  copy,
  values: controlled,
  defaultValues,
  onValuesChange,
  onSubmit,
  step = 'credentials',
  onStepChange,
  code: controlledCode,
  onCodeChange,
  onVerify,
  onResend,
  resendSeconds = 30,
  minimumPasswordLength = 8,
  validate,
  providers = defaultProviders,
  onProvider,
  onForgotPassword,
  onRegister,
  loading = false,
  error,
  ...props
}: BaseSignInBlockProps) {
  const theme = useBaseTheme(props.theme);
  const t = { ...defaultCopy, ...copy };
  const [internal, setInternal] = useState<SignInValues>({
    email: '',
    password: '',
    remember: false,
    ...defaultValues,
  });
  const values = controlled ?? internal;
  const [localCode, setLocalCode] = useState('');
  const code = controlledCode ?? localCode;
  const [attempted, setAttempted] = useState(false);
  const [codeAttempted, setCodeAttempted] = useState(false);
  const cooldown = Math.max(0, Math.floor(resendSeconds));
  const update = (next: Partial<SignInValues>) => {
    const merged = { ...values, ...next };
    if (controlled === undefined) setInternal(merged);
    onValuesChange?.(merged);
  };
  const failures = validate
    ? validate(values)
    : {
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())
          ? undefined
          : t.invalidEmail,
        password:
          values.password.length >= minimumPasswordLength
            ? undefined
            : t.invalidPassword,
      };
  const submit = () => {
    if (loading) return;
    if (step === 'verification') {
      setCodeAttempted(true);
      if (/^\d{6}$/.test(code)) onVerify?.(code);
    } else {
      setAttempted(true);
      if (!failures.email && !failures.password)
        onSubmit?.({ ...values, email: values.email.trim() });
    }
  };
  return (
    <BlockFrame
      {...props}
      theme={theme}
      title={t.title}
      backLabel={props.backLabel ?? t.back}
    >
      <BlockSection>
        {brand}
        <BlockText medium style={{ fontSize: 24, lineHeight: 32 }}>
          {step === 'credentials' ? t.heading : t.verifyHeading}
        </BlockText>
        <BlockText muted>
          {step === 'credentials' ? t.description : t.verifyDescription}
        </BlockText>
      </BlockSection>
      {error ? (
        <BaseAlert
          variant="destructive"
          title={t.errorTitle}
          description={error}
        />
      ) : null}
      {step === 'credentials' ? (
        <>
          <BlockSection index={1}>
            <BaseInput
              label={t.email}
              placeholder={t.emailPlaceholder}
              value={values.email}
              onChangeText={(email) => update({ email })}
              disabled={loading}
              error={attempted ? failures.email : undefined}
              testID="sign-in-email"
              inputProps={{
                keyboardType: 'email-address',
                autoComplete: 'email',
                autoCapitalize: 'none',
                autoCorrect: false,
              }}
            />
            <BaseInput
              label={t.password}
              placeholder={t.passwordPlaceholder}
              value={values.password}
              onChangeText={(password) => update({ password })}
              secureTextEntry
              revealable
              showPasswordLabel={t.showPassword}
              hidePasswordLabel={t.hidePassword}
              disabled={loading}
              error={attempted ? failures.password : undefined}
              inputProps={{
                autoComplete: 'current-password',
                autoCapitalize: 'none',
                returnKeyType: 'go',
                onSubmitEditing: submit,
              }}
            />
            {formAccessory}
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: theme.space[2],
              }}
            >
              {showRemember && <View
                style={{
                  minHeight: 48,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.space[3],
                }}
              >
                <BaseCheckbox
                  value={values.remember}
                  onValueChange={(remember) => update({ remember })}
                  disabled={loading}
                  accessibilityLabel={t.remember}
                />
                <BlockText>{t.remember}</BlockText>
              </View>}
              <BaseButton
                variant="link"
                onPress={onForgotPassword}
                disabled={loading}
                style={{ minHeight: 48 }}
              >
                {t.forgot}
              </BaseButton>
            </View>
            <BaseButton
              fullWidth
              loading={loading}
              onPress={submit}
              testID={props.testID ?? 'base-sign-in-block'}
              style={{ minHeight: 48 }}
            >
              {t.submit}
            </BaseButton>
          </BlockSection>
          {providers.length ? (
            <BlockSection index={2}>
              <BaseSeparator label={t.separator} decorative={false} />
              {providers.map((provider) => (
                <BaseButton
                  key={provider.id}
                  fullWidth
                  variant="outline"
                  leading={provider.icon}
                  disabled={loading}
                  onPress={() => onProvider?.(provider.id)}
                  style={{ minHeight: 48 }}
                >
                  {provider.label}
                </BaseButton>
              ))}
            </BlockSection>
          ) : null}
          <BlockSection index={3}>
            <BlockText muted style={{ textAlign: 'center' }}>
              {t.registerHint}
            </BlockText>
            <BaseButton
              variant="link"
              fullWidth
              onPress={onRegister}
              disabled={loading}
              style={{ minHeight: 48 }}
            >
              {t.register}
            </BaseButton>
          </BlockSection>
        </>
      ) : (
        <BlockSection key="verification" index={1}>
          <BaseInputOTP
            length={6}
            groups={[3, 3]}
            value={code}
            onChangeText={(next) => {
              if (controlledCode === undefined) setLocalCode(next);
              onCodeChange?.(next);
              setCodeAttempted(false);
            }}
            disabled={loading}
            error={!!error || (codeAttempted && code.length !== 6)}
            accessibilityLabel={t.code}
            testID="sign-in-code"
          />
          {codeAttempted && code.length !== 6 ? (
            <BaseAlert variant="destructive" title={t.invalidCode} />
          ) : null}
          <BaseButton
            fullWidth
            loading={loading}
            onPress={submit}
            testID={props.testID ?? 'base-sign-in-block'}
            style={{ minHeight: 48 }}
          >
            {t.verify}
          </BaseButton>
          <ResendCodeButton
            key={cooldown}
            cooldown={cooldown}
            loading={loading}
            onResend={onResend}
            label={t.resend}
            countdown={t.resendCountdown}
          />
          <BaseButton
            fullWidth
            variant="link"
            onPress={() => onStepChange?.('credentials')}
            disabled={loading}
            style={{ minHeight: 48 }}
          >
            {t.changeEmail}
          </BaseButton>
        </BlockSection>
      )}
    </BlockFrame>
  );
}
function ResendCodeButton({
  cooldown,
  loading,
  onResend,
  label,
  countdown,
}: {
  cooldown: number;
  loading: boolean;
  onResend?: () => void;
  label: string;
  countdown: string;
}) {
  const [deadline, setDeadline] = useState(() => Date.now() + cooldown * 1000);
  const [remaining, setRemaining] = useState(cooldown);
  useEffect(() => {
    const timer = setInterval(
      () =>
        setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000))),
      250,
    );
    return () => clearInterval(timer);
  }, [deadline]);
  return (
    <BaseButton
      fullWidth
      variant="outline"
      disabled={loading || remaining > 0}
      onPress={() => {
        setRemaining(cooldown);
        setDeadline(Date.now() + cooldown * 1000);
        onResend?.();
      }}
      style={{ minHeight: 48 }}
    >
      {remaining > 0
        ? countdown.replace('{seconds}', String(remaining))
        : label}
    </BaseButton>
  );
}
export default BaseSignInBlock;
