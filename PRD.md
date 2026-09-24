PRD — StopDoomscrolling Chrome Extension

Status: Draft v0.1
Product: StopDoomscrolling
Platform: Chrome Extension (Manifest V3)
Primary supported sites: TikTok, Instagram

1. Product Overview

StopDoomscrolling is a Chrome Extension designed to help users stop excessive short-form video/reel scrolling and use TikTok and Instagram only for the amount of time they actually need.

The product detects prolonged scrolling sessions, warns the user, and closes the relevant website when the intervention threshold is reached. Users may override the intervention once for up to 15 additional minutes.

2. Problem Statement

Short-form video feeds such as TikTok and Instagram Reels are designed for continuous consumption. Users can enter a scrolling session with a specific intention but continue for hours.

StopDoomscrolling addresses this by introducing a simple friction mechanism:

Detect prolonged scrolling.

Notify the user that the session has exceeded the intended limit.

Close the website.

Allow one controlled override of up to 15 minutes.

Prevent another override during the same daily allowance/reset period.

3. Product Goal

Help users stop doomscrolling and keep scrolling within a reasonable amount of time needed for their purpose.

Primary Goal

Reduce excessive TikTok and Instagram scrolling sessions.

Non-Goals

Diagnose or treat addiction or mental-health conditions.

Completely prevent users from accessing social media.

Analyze private messages or unrelated browsing activity.

Replace professional mental-health support.

4. Target Users

Primary Audience

General Chrome users who feel they spend too much time scrolling TikTok or Instagram.

The initial product does not target a narrow demographic.

Core User Need

“I want to use TikTok/Instagram when I need them without accidentally spending hours scrolling.”

5. Supported Websites

MVP

TikTok

Instagram

Future

The architecture should allow additional sites such as YouTube Shorts, Facebook Reels, X, Reddit, and other feed-based platforms.

6. Definition of Doomscrolling

For MVP, doomscrolling is defined operationally as:

A prolonged session of continuous or repeated short-form video/reel consumption beyond the user's configured or product-defined time threshold.

The initial implementation should focus on time + scrolling/feed activity, rather than attempting to infer the user's emotional state.

7. Core User Flow

User installs StopDoomscrolling.

User completes minimal onboarding.

User selects or confirms supported sites.

User starts browsing TikTok or Instagram.

Extension tracks the relevant browsing session.

When the threshold is reached, extension shows a warning notification/intervention.

The site is closed when the intervention is triggered.

User may choose Continue for 15 minutes.

The 15-minute override can be used only once.

After the override expires, the site is closed again.

User cannot use another override until the configured reset period.

8. Functional Requirements

FR-01 — Session Tracking

The extension SHALL track time spent on supported sites.

The extension SHOULD distinguish active browsing from an inactive/background tab where technically feasible.

FR-02 — Feed/Scrolling Detection

The extension SHOULD detect activity associated with short-form video/reel consumption.

Initial signals may include:

Active time on TikTok/Instagram.

Scroll events.

Navigation between feed items.

Visibility/activity of the supported page.

The MVP does not need machine-learning-based detection.

FR-03 — Threshold

The product SHALL have a configurable or predefined doomscrolling threshold.

Recommended MVP default: 30 minutes per session.

This default should be configurable later.

FR-04 — Warning

Before or at the threshold, the extension SHALL notify the user.

Example:

“You’ve been scrolling for 30 minutes. Is there something you still need to do?”

The exact copy should remain configurable during UX design.

FR-05 — Website Closure

When the intervention threshold is reached, the extension SHALL close the active TikTok/Instagram tab or otherwise prevent continued feed consumption.

FR-06 — One-Time Override

The user MAY override the intervention.

Rules:

Maximum override duration: 15 minutes.

Override can be used once during the applicable reset period.

Once consumed, the override cannot be used again until reset.

When the 15 minutes expires, the extension closes the site again.

FR-07 — Override State

The extension SHALL persist whether the one-time override has been consumed.

Closing/reopening Chrome SHALL NOT unintentionally reset the override.

FR-08 — Popup

The extension popup SHOULD show:

Current session time.

Current status.

Time remaining before intervention.

Whether the 15-minute override is available.

Basic settings shortcut.

FR-09 — Settings

The user SHOULD be able to configure:

Enabled websites.

Session threshold.

Override behavior.

Notification preference.

Reset period.

FR-10 — Daily/Periodic Reset

The MVP SHOULD reset the one-time override according to a clearly defined period.

Recommended default: daily reset.

9. UX Requirements

The UX should be intentionally simple.

Onboarding

Welcome.

Explain the purpose.

Select supported sites.

Confirm time limit.

Done.

Intervention

The intervention should clearly communicate:

Why the user is being interrupted.

How long they have been scrolling.

What will happen next.

That one 15-minute override is available, if unused.

Principles

Minimal friction during normal use.

Strong friction at the intervention point.

No shame-based language.

Clear and predictable rules.

User remains in control through the single override.

10. User Stories

US-01

As a user, I want StopDoomscrolling to detect excessive scrolling so that I don't accidentally spend hours on TikTok or Instagram.

US-02

As a user, I want to receive a warning before being interrupted so that I understand why the extension is taking action.

US-03

As a user, I want the website to close after the limit so that I actually stop scrolling.

US-04

As a user, I want one 15-minute override so that I can finish something important without permanently disabling the extension.

US-05

As a user, I want the extension to remember that I already used my override so that I cannot repeatedly bypass the limit.

11. MVP Scope

Must Have

Chrome Extension.

TikTok support.

Instagram support.

Session timer.

Scroll/feed activity detection.

Configurable/default time threshold.

Warning notification/intervention.

Automatic tab closure.

One-time 15-minute override.

Persistent override state.

Basic popup.

Basic settings.

Should Have

Daily usage statistics.

Simple daily reset.

Active-tab awareness.

Basic onboarding.

Future

AI-based behavioral detection.

More social platforms.

Cross-device sync.

Account system.

Gamification.

Advanced analytics.

Mobile version.

12. Technical Requirements

Browser

Google Chrome

Manifest V3

Likely Components

Content Script: detect relevant page/feed/scroll activity.

Service Worker: session state, timers, notifications, enforcement.

Chrome Storage: settings and persistent override state.

Popup UI: current status and controls.

Permissions

Request only permissions necessary for supported-site monitoring, storage, tabs/notifications, and enforcement.

The implementation should minimize permissions to improve user trust and Chrome Web Store compliance.

13. Privacy

Privacy should be a core product principle.

The MVP SHOULD:

Store usage statistics locally where possible.

Avoid collecting message contents.

Avoid collecting unrelated browsing history.

Avoid sending visited URLs to a server unless explicitly required.

Clearly explain required Chrome permissions.

Provide a way to reset/delete locally stored product data.

14. Edge Cases

The extension SHALL account for:

Multiple TikTok/Instagram tabs.

Switching between TikTok and Instagram.

Browser restart.

Tab refresh.

Closing the active tab manually.

Background tabs.

User disabling the extension.

User opening the site again immediately after closure.

Override being active when Chrome closes.

Clock/time changes.

Website DOM changes that break feed detection.

If exact feed detection fails, the system should fall back to reliable active-site/session timing rather than silently claiming accurate scroll detection.

15. Success Metrics

Primary:

Reduction in average TikTok/Instagram session duration.

Reduction in sessions exceeding the configured threshold.

Percentage of interventions that result in the user leaving the site.

Secondary:

Override usage rate.

Repeat override attempts.

7-day retention.

Daily active users.

Percentage of users who keep the extension enabled.

16. Acceptance Criteria

Detection

Given the user is actively browsing a supported site, the extension records session time.

The timer does not incorrectly reset on ordinary page interactions.

Session state survives normal tab navigation where applicable.

Intervention

When the configured threshold is reached, the user receives the defined warning/intervention.

The supported site is closed/prevented from continued use according to the selected enforcement behavior.

Override

If the override is unused, the user can activate it.

Override duration is exactly 15 minutes maximum.

The override cannot be activated a second time during the same reset period.

Override state persists across browser restarts.

Privacy

The extension does not collect unrelated browsing activity.

Required permissions are disclosed to the user.

17. Risks

False Positives

A user may be researching something legitimate on TikTok/Instagram.

Mitigation: one-time 15-minute override and configurable thresholds.

Circumvention

Users can disable/uninstall the extension or use another browser.

Mitigation: do not attempt invasive anti-circumvention in MVP; focus on voluntary behavior change.

Detection Reliability

Platform UI changes may break scroll/feed detection.

Mitigation: use robust session-time tracking as the fallback.

User Frustration

Automatic closure may feel abrupt.

Mitigation: provide a clear warning and transparent 15-minute override.

18. Open Product Decisions

These should be finalized before development:

Exact default threshold: proposed 30 minutes.

Whether the warning appears 5 minutes before the limit or exactly at the limit.

Whether “close website” means closing the tab or navigating to a StopDoomscrolling intervention page.

Exact daily reset time/timezone behavior.

Whether the 15-minute override applies separately to TikTok and Instagram or is shared across both.

Whether time is counted per site or across both sites.

Whether the user can customize the threshold.

Exact onboarding and intervention copy.

19. Recommended MVP Product Rule

For a simple first release:

30 minutes of active TikTok/Instagram use → warning → website closes → user can use one 15-minute override → website closes again → override resets the next day.

This rule is intentionally simple and measurable, making it suitable for an MVP.

20. Future Roadmap

Phase 1 — MVP

TikTok

Instagram

Session timer

Detection

Warning

Closure

One-time 15-minute override

Popup/settings

Local persistence

Phase 2

Better feed detection

Usage dashboard

Daily/weekly reports

More configurable rules

YouTube Shorts support

Better notifications

Phase 3

AI-assisted behavioral detection

Cross-device synchronization

Account system

More platforms

Personal goals

Advanced behavioral insights

21. Product Principle

StopDoomscrolling should not try to control the user's entire internet usage.

Its purpose is narrower:

Help people use short-form social media intentionally instead of unintentionally scrolling for hours.

18. Confirmed Product Decisions

The following decisions are now confirmed for the MVP:

Default limit: 30 minutes per session.

Warning: shown 5 minutes before the configured limit.

Enforcement: the TikTok/Instagram tab is actually closed when the limit is reached.

Override: each supported website has its own one-time 15-minute override.

Timers: TikTok and Instagram are tracked separately.

Custom limit: users may change the limit, with a maximum of 2 hours.

Reset: the one-time override becomes available again when the calendar day changes.

Strict Mode: users may enable Strict Mode.

19. Updated Per-Site Rules

TikTok and Instagram have independent usage states.

Example:

TikTok limit: 30 minutes

Instagram limit: 30 minutes

TikTok override: available independently

Instagram override: available independently

Using the TikTok override does not consume the Instagram override.

The product SHOULD store at least:

tiktokSessionTime

instagramSessionTime

tiktokOverrideUsed

instagramOverrideUsed

tiktokLimit

instagramLimit

lastResetDate

20. Warning Timing

For a configured limit of 30 minutes:

At approximately 25 minutes: warning is shown.

At 30 minutes: intervention occurs and the tab is closed.

If the user activates the 15-minute override: a new 15-minute override session begins.

At the end of the override: the relevant site is closed again.

For a custom limit, the warning should occur 5 minutes before the configured limit, provided the configured limit is greater than 5 minutes.

21. Custom Time Limit

Users can configure their limit independently for TikTok and Instagram.

Constraints:

Minimum should be defined during implementation.

Maximum: 2 hours (120 minutes).

Default: 30 minutes.

Example:

Website

Default

Maximum

TikTok

30 min

120 min

Instagram

30 min

120 min

22. Strict Mode

Strict Mode is an optional setting intended for users who want stronger enforcement.

Normal Mode

Warning at T−5 minutes.

Website closes at the limit.

One 15-minute override is available per website per day.

Strict Mode

Recommended MVP behavior:

Same time threshold.

Website closes at the limit.

Override is disabled.

Strict Mode should be clearly explained before activation so users understand that they are choosing stronger enforcement.

23. Daily Reset

The override state resets when the calendar day changes according to the user's local browser/system date.

Example:

September 24: TikTok override used → unavailable for the remainder of September 24.

September 25: TikTok override becomes available again.

TikTok and Instagram reset independently based on whether their respective override was used.

24. Updated Acceptance Criteria

Warning

Given a 30-minute limit:

At approximately 25 minutes of active use, the user receives a warning.

The warning clearly states that the limit is approaching.

The warning does not consume the user's override.

Closure

Given that the user reaches the configured limit:

The extension closes the relevant TikTok or Instagram tab.

The other website is not affected.

The user's state is persisted.

Per-Site Override

Given that the TikTok override has already been used:

TikTok cannot receive another override until the next calendar day.

Instagram may still use its own override if it has not been consumed.

Custom Limit

Given a user configures a limit:

The value cannot exceed 120 minutes.

TikTok and Instagram can have different limits.

The warning is calculated as five minutes before that site's configured limit.

Strict Mode

Given Strict Mode is enabled:

The normal one-time override is unavailable.

The configured limit is still enforced.

The relevant tab is closed when the limit is reached.
