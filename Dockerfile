# Find eligible builder and runner images on Docker Hub. We use Ubuntu/Debian
# instead of Alpine to avoid DNS resolution issues in production.
#
# https://hub.docker.com/r/hexpm/elixir/tags?page=1&name=ubuntu
# https://hub.docker.com/_/ubuntu?tab=tags
#
# This file is based on these images:
#
#   - https://hub.docker.com/r/hexpm/elixir/tags - for the build image
#   - https://hub.docker.com/_/debian?tab=tags&page=1&name=bullseye-20250113-slim - for the release image
#   - https://pkgs.org/ - resource for finding needed packages
#   - Ex: hexpm/elixir:1.18.1-erlang-27.2-debian-bullseye-20250113-slim
#
ARG ELIXIR_VERSION=1.18.3
ARG OTP_VERSION=27.3
ARG DEBIAN_VERSION=bullseye-20250317-slim

ARG BUILDER_IMAGE="hexpm/elixir:${ELIXIR_VERSION}-erlang-${OTP_VERSION}-debian-${DEBIAN_VERSION}"
ARG RUNNER_IMAGE="debian:${DEBIAN_VERSION}"

FROM ${BUILDER_IMAGE} AS builder

# install build dependencies
RUN apt-get update -y && apt-get install -y \
  build-essential wget \
  git \
  curl \
  && curl -sL https://deb.nodesource.com/setup_22.x | bash - && \
  apt-get install -y \
  nodejs && \
  apt-get clean && rm -f /var/lib/apt/lists/*_*

# ARG LITESTREAM_VERSION=0.3.13
# Install litestream
# RUN wget https://github.com/benbjohnson/litestream/releases/download/v${LITESTREAM_VERSION}/litestream-v${LITESTREAM_VERSION}-linux-amd64.deb \
# && dpkg -i litestream-v${LITESTREAM_VERSION}-linux-amd64.deb

RUN npm install -g pnpm 
RUN pnpm self-update

# prepare build dir
WORKDIR /app

# install hex + rebar
RUN mix local.hex --force && \
  mix local.rebar --force

# set build ENV
ENV MIX_ENV="prod"
ENV NODE_ENV="production"

# install mix dependencies
COPY mix.exs mix.lock ./
RUN mix deps.get --only $MIX_ENV
RUN mkdir config

# copy compile-time config files before we compile dependencies
# to ensure any relevant config change will trigger the dependencies
# to be re-compiled.
COPY config/config.exs config/${MIX_ENV}.exs config/
RUN mix deps.compile

# Create directories for persistent data
RUN mkdir -p /app/priv/static /app/data

# Copy application code
COPY priv priv
COPY lib lib

# COPY assets assets

################ compile assets using pnpm & Vite
WORKDIR /app/assets
COPY assets/package.json assets/pnpm-lock.yaml* ./
# Setup pnpm store for better caching
RUN pnpm config set store-dir /app/.pnpm-store
RUN pnpm install

COPY assets/ ./
RUN pnpm exec vite build --config vite.config.js

WORKDIR /app
RUN mix tailwind solidyjs --minify
RUN mix phx.digest

# Compile the release
RUN mix compile

# Changes to config/runtime.exs don't require recompiling the code
COPY config/runtime.exs config/

COPY rel rel
RUN mix release

##################################################################
FROM ${RUNNER_IMAGE}

RUN apt-get update -y && \
  apt-get install -y libstdc++6 openssl libncurses5 locales ca-certificates \
  && apt-get clean && rm -f /var/lib/apt/lists/*_*

# Set the locale
RUN sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && locale-gen

ENV LANG=en_US.UTF-8
ENV LANGUAGE=en_US:en
ENV LC_ALL=en_US.UTF-8

WORKDIR "/app"

# set runner ENV
ENV MIX_ENV="prod"

# Only copy the final release from the build stage
COPY --from=builder --chown=nobody:root /app/_build/${MIX_ENV}/rel/solidyjs ./

# Create data directory with proper permissions
RUN mkdir -p /app/data && \
  chown -R nobody:nogroup /app/data && \
  chmod -R 777 /app/data && \
  chown nobody /app

# Copy Litestream binary from build stage
COPY --from=builder /usr/bin/litestream /usr/bin/litestream
COPY litestream.sh /app/bin/litestream.sh
COPY config/litestream.yml /etc/litestream.yml

USER nobody

EXPOSE 4000
# Run litestream script as entrypoint
ENTRYPOINT ["/bin/bash", "/app/bin/litestream.sh"]

CMD ["/bin/sh", "-c", "mkdir -p /app/data && /app/bin/server"]


