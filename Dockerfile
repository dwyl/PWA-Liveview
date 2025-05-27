# Stage 1: Build
ARG ELIXIR_VERSION=1.18.3
ARG OTP_VERSION=27.3.3
ARG DEBIAN_VERSION=bullseye-20250428-slim

ARG BUILDER_IMAGE="hexpm/elixir:${ELIXIR_VERSION}-erlang-${OTP_VERSION}-debian-${DEBIAN_VERSION}"
ARG RUNNER_IMAGE="debian:${DEBIAN_VERSION}"

ARG MIX_ENV=prod
ARG NODE_ENV=production

FROM ${BUILDER_IMAGE} AS builder


RUN apt-get update -y && apt-get install -y \
  build-essential  git curl && \
  curl -sL https://deb.nodesource.com/setup_22.x | bash - && \
  apt-get install -y nodejs && \
  apt-get clean && rm -f /var/lib/apt/lists/*_*

ARG MIX_ENV
ARG NODE_ENV
ENV MIX_ENV=${MIX_ENV} \
  NODE_ENV=${NODE_ENV}

# Install pnpm
RUN npm install -g pnpm 

# Prepare build dir
WORKDIR /app

# Install Elixir deps
RUN mix local.hex --force && mix local.rebar --force

COPY mix.exs mix.lock ./
RUN mix deps.get --only ${MIX_ENV}
RUN mkdir config

# compile Elxirr deps
COPY config/config.exs config/${MIX_ENV}.exs config/
RUN mix deps.compile

# compile Node deps
WORKDIR /app/assets
COPY assets/package.json assets/pnpm-lock.yaml ./
RUN pnpm self-update && pnpm install --frozen-lockfile
WORKDIR /app

# Copy app server code---------
#### Note: 
#  the server code may contain Tailwind classes
# and Tailwind will read the server (and client code)
# thus needs to be copied before the assets
COPY lib lib

# Copy, install & build assets--------
COPY priv priv

#  this will copy the assets/.env for the Maptiler api key loaded by Vite.loadenv
WORKDIR /app/assets
COPY assets ./ 
RUN pnpm vite build --mode ${NODE_ENV} --config vite.config.js

WORKDIR /app
# RUN mix phx.digest <-- used Vite to fingerprint assets instead
RUN mix compile

COPY config/runtime.exs config/

# Build the release-------
COPY rel rel
RUN mix release

# Stage 2: Runtime --------------------------------------------
FROM ${RUNNER_IMAGE}

RUN apt-get update -y && \
  apt-get install -y libstdc++6 openssl libncurses5 locales ca-certificates \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

ENV MIX_ENV=prod

RUN sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && locale-gen
ENV LANG=en_US.UTF-8 LANGUAGE=en_US:en LC_ALL=en_US.UTF-8

WORKDIR /app

COPY --from=builder --chown=nobody:root /app/_build/${MIX_ENV}/rel/liveview_pwa ./

# <-- needed for local testing
# RUN chown -R nobody:nogroup /mnt
# RUN mkdir -p /app/db && \
#   chown -R nobody:nogroup /app/db && \
#   chmod -R 777 /app/db && \
#   chown nobody /app

USER nobody

EXPOSE 4000
CMD ["/bin/sh", "-c", "/app/bin/server"]
