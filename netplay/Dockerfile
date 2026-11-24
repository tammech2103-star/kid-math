FROM rust:1.85-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN git clone --depth 1 --branch rust https://github.com/EmulatorJS/EmulatorJS-Netplay.git . \
    && cargo build --release

ENV PORT=10000
EXPOSE 10000

CMD ["cargo", "run", "--release"]