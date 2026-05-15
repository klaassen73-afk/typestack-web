# syntax=docker/dockerfile:1.6
#
# Multi-stage Dockerfile for the TypeStack web dashboard.
# Targets:
#   dev    — Vite dev server, source mounted from host
#   build  — produces /app/dist for the server's prod image to serve

FROM node:22-bookworm-slim AS base
WORKDIR /app
COPY package.json ./
RUN npm install

FROM base AS dev
EXPOSE 5173
CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "5173"]

FROM base AS build
COPY . .
RUN npm run build
