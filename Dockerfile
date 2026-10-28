# -----------------------------
# Base image
# -----------------------------
FROM php:8.3-cli-bookworm

# -----------------------------
# Install dependencies
# -----------------------------
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git unzip libpq-dev libicu-dev libzip-dev \
    && docker-php-ext-install pdo_pgsql intl zip \
    && rm -rf /var/lib/apt/lists/*

# -----------------------------
# Copy composer
# -----------------------------
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# -----------------------------
# Set working directory
# -----------------------------
WORKDIR /app
