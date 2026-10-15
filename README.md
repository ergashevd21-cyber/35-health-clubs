# 35 Health Clubs — Employee Survey

A responsive static employee feedback survey.

## Features
- 17 survey questions from the agreed employee questionnaire.
- Responsive layout and progress indicator.
- Saves answers to Supabase `public.survey_responses`.
- No employee name field.
- Public publishable key is used in the browser; database access is restricted by Row Level Security.

## Deployment
Deploy the repository root on Vercel as a static site. Build command: none. Output directory: `.`.

## Database
Table columns: `answers` (jsonb), `survey_version` (text), `submitted_at` (timestamptz). Anonymous users should only be able to insert valid survey responses. Do not add public SELECT, UPDATE, or DELETE policies.

## Reporting roadmap
- Add a protected HR reporting interface.
- Return only aggregated metrics to authorized HR users.
- Keep raw employee comments and response records private.
- Standard eNPS requires a 0–10 recommendation scale. The current recommendation question uses Poor / Normal / Good, so standard eNPS is not available until that question is changed.
