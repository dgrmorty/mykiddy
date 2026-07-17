-- Interactive in-video quizzes: pause at timestamp until answered.
alter table public.lessons
  add column if not exists quiz_cues jsonb not null default '[]'::jsonb;

comment on column public.lessons.quiz_cues is
  'Array of {id, time_sec, question, options[], correct_index} — pause video at time_sec for quiz.';
