# Quiz Architecture

## MVP Question Types

- Single choice
- True/False

## Future

- Multiple answer
- Matching
- Ordering
- Short answer
- Reflection

## Security

- Correct answer tidak dikirim sebelum diizinkan.
- Scoring di server.
- Attempt hanya milik peserta.
- Max attempts ditegakkan server-side.

## Tables

- `quizzes`
- `questions`
- `question_options`
- `quiz_attempts`
- `quiz_answers`

## Flow

Start Attempt → Load Questions → Submit Answers → Server Scoring → Save Result → Show Feedback
