# Stage 1: build the Next.js frontend as static files. The agreement's wording
# is read from templates/ at build time, so it is copied in beside frontend/.
FROM node:24-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY templates/ /app/templates/
COPY frontend/ ./
RUN npm run build

# Stage 2: the FastAPI backend, serving the API and the exported frontend.
# The repository layout is mirrored so the backend's default paths resolve.
FROM python:3.14-slim
COPY --from=ghcr.io/astral-sh/uv:0.12 /uv /usr/local/bin/uv
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy
WORKDIR /app/backend
COPY backend/pyproject.toml backend/uv.lock backend/.python-version ./
RUN uv sync --locked --no-dev
COPY backend/app ./app
COPY catalog.json /app/catalog.json
COPY --from=frontend /app/frontend/out /app/frontend/out
EXPOSE 8000
CMD ["uv", "run", "--no-sync", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
