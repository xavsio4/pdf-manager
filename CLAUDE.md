## App Development Guide

- Everything is done within a docker container.
- When a task is completed, don't try to test the frontend automatically. Ask for user input.
- update the CHANGELOG.md file when commits are done. Add the task result if successful.
- commit on github when task is successful but ask before push

## technologies used

Docker, Postgres, NEXT.js, Ollama, Python with fastApi for the backend, celery, flower, redis.

## Interacting with the app

The url of the local developed app should always be http://localhost:3000. Don't hesitate in using 'docker-compose build' or 'docker-compose restart'.
