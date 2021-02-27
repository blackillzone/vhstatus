#
# ---- Base Node ----
FROM alpine:3.12 AS base

ENV USER=npm
ENV UID=1000
ENV GID=1000

RUN apk add --no-cache nodejs npm tini
RUN addgroup \
    -S "${USER}" \
    -g "${GID}"
RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/usr/src/app" \
    --ingroup "${USER}" \
    --no-create-home \
    --uid "${UID}" \
    "${USER}"

USER ${USER}

WORKDIR /usr/src/app

ENTRYPOINT ["/sbin/tini", "--"]

COPY package.json .

#
# ---- Dependencies ----
FROM base AS dependencies

RUN npm set progress=false && npm config set depth 0
RUN npm install --only=production 
RUN cp -R node_modules prod_node_modules
RUN npm install

#
# ---- Release ----
FROM base AS release

ENV VALHEIM_SERVER_LOG_PATH="/home/vhserver/log/console/vhserver-console.log"
ENV VALHEIM_SERVER_REFRESH_INTERVAL=5000
ENV VALHEIM_SERVER_NAME="Valheim Server"
ENV VALHEIM_SERVER_PORT=3000

COPY --from=dependencies /usr/src/app/prod_node_modules ./node_modules
COPY . .

EXPOSE 3000

CMD ["npm", "run", "start"]