# Stage 1: Build
ARG ELIXIR_VERSION=1.18.3
ARG OTP_VERSION=27.3.3
ARG DEBIAN_VERSION=bullseye-20250428-slim

ARG BUILDER_IMAGE="hexpm/elixir:${ELIXIR_VERSION}-erlang-${OTP_VERSION}-debian-${DEBIAN_VERSION}"
ARG RUNNER_IMAGE="debian:${DEBIAN_VERSION}"

FROM ${BUILDER_IMAGE} AS builder

RUN apt-get update -y && apt-get install -y \
  build-essential  git curl && \
  curl -sL https://deb.nodesource.com/setup_22.x | bash - && \
  apt-get install -y nodejs && \
  apt-get clean && rm -f /var/lib/apt/lists/*_*

RUN npm install -g pnpm 

# Prepare build dir
WORKDIR /app

# Install Elixir deps
RUN mix local.hex --force && mix local.rebar --force

ENV MIX_ENV=prod
ENV NODE_ENV=production

COPY mix.exs mix.lock ./
RUN mix deps.get --only prod
RUN mkdir config

COPY config/config.exs config/${MIX_ENV}.exs config/
RUN mix deps.compile

# Copy app server code---------
COPY lib lib
#### Note: 
#  the server code may contain Tailwind classes
# and Tailwind will read the server (and client code)
# thus needs to be copied before the assets

# Copy, install & build assets--------
COPY priv priv
WORKDIR /app/assets
COPY assets/package.json assets/pnpm-lock.yaml ./
RUN pnpm self-update && pnpm install --frozen-lockfile
COPY assets ./
RUN pnpm vite build --mode production --config vite.config.js

# fingerprint assets and compile Elixir modules
WORKDIR /app
# RUN mix phx.digest <-- use Vite to fingerprint assets
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

RUN sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && locale-gen
ENV LANG=en_US.UTF-8 LANGUAGE=en_US:en LC_ALL=en_US.UTF-8

WORKDIR /app

ENV MIX_ENV=prod

COPY --from=builder --chown=nobody:root /app/_build/${MIX_ENV}/rel/solidyjs ./

RUN mkdir -p /app/data && \
  chown -R nobody:nogroup /app/data && \
  chmod -R 777 /app/data && \
  chown nobody /app

USER nobody

EXPOSE 4000
CMD ["/bin/sh", "-c", "/app/bin/server"]
