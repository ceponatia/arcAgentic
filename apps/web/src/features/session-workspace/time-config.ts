import {
  DEFAULT_TIME_CONFIG,
  SettingProfileSchema,
  formatGameTime,
  type SettingProfile,
  type TimeConfig,
} from "@arcagentic/schemas";

export type SessionStartTime =
  | {
    year?: number;
    month?: number;
    day?: number;
    hour: number;
    minute: number;
  }
  | undefined;

export interface ResolvedStartTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function sanitizeTimeConfig(timeConfig: unknown): TimeConfig {
  const parsed = SettingProfileSchema.shape.timeConfig.safeParse(timeConfig);

  if (!parsed.success || parsed.data === undefined) {
    return DEFAULT_TIME_CONFIG;
  }

  return parsed.data as TimeConfig;
}

export function resolveTimeConfig(settingProfile: SettingProfile | null): TimeConfig {
  return sanitizeTimeConfig(settingProfile?.timeConfig);
}

export function toResolvedStartTime(
  startTime: SessionStartTime,
  timeConfig: TimeConfig,
): ResolvedStartTime {
  const defaultStartTime = timeConfig.defaultStartTime;

  return {
    year: Math.max(1, startTime?.year ?? defaultStartTime.year),
    month: clamp(
      startTime?.month ?? defaultStartTime.month,
      1,
      Math.max(1, timeConfig.monthsPerYear),
    ),
    day: clamp(
      startTime?.day ?? defaultStartTime.dayOfMonth,
      1,
      Math.max(1, timeConfig.daysPerMonth),
    ),
    hour: clamp(
      startTime?.hour ?? defaultStartTime.hour,
      0,
      Math.max(0, timeConfig.hoursPerDay - 1),
    ),
    minute: clamp(startTime?.minute ?? defaultStartTime.minute, 0, 59),
  };
}

export function toGameTime(startTime: ResolvedStartTime, timeConfig: TimeConfig) {
  const absoluteDay =
    (startTime.year - 1) * timeConfig.monthsPerYear * timeConfig.daysPerMonth +
    (startTime.month - 1) * timeConfig.daysPerMonth +
    startTime.day;

  return {
    year: startTime.year,
    month: startTime.month,
    dayOfMonth: startTime.day,
    absoluteDay,
    hour: startTime.hour,
    minute: startTime.minute,
    second: 0,
  };
}

export function normalizeStartTime(
  startTime: Exclude<SessionStartTime, undefined>,
  settingProfile: SettingProfile | null,
) {
  const timeConfig = resolveTimeConfig(settingProfile);

  return {
    year: startTime.year ?? timeConfig.defaultStartTime.year,
    month: startTime.month ?? timeConfig.defaultStartTime.month,
    day: startTime.day ?? timeConfig.defaultStartTime.dayOfMonth,
    hour: startTime.hour,
    minute: startTime.minute,
  };
}

export function formatDefaultStartTime(timeConfig: TimeConfig): string {
  return formatGameTime(timeConfig.defaultStartTime, timeConfig, {
    showSeconds: false,
    use24Hour: true,
    showPeriod: true,
  });
}

export function formatStartTime(
  startTime: SessionStartTime,
  timeConfig: TimeConfig,
): string {
  if (!startTime) {
    return `Setting default: ${formatDefaultStartTime(timeConfig)}`;
  }

  const resolvedStartTime = toResolvedStartTime(startTime, timeConfig);

  return `Custom start: ${formatGameTime(
    toGameTime(resolvedStartTime, timeConfig),
    timeConfig,
    {
      showSeconds: false,
      use24Hour: true,
      showPeriod: true,
    },
  )}`;
}
