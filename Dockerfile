# Multi-stage Dockerfile — 建置與執行分離
# Stage 1: 建置
FROM node:20-alpine AS builder

WORKDIR /app

# 複製依賴描述檔（利用 Docker 快取層）
COPY package.json package-lock.json* ./
RUN npm ci --production=false

# 複製原始碼並建置
COPY . .
RUN npm run build

# Stage 2: 執行（Nginx 靜態服務）
FROM nginx:alpine AS runner

# 複製自訂 Nginx 設定
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 從建置階段複製打包產物
COPY --from=builder /app/dist /usr/share/nginx/html

# 開放 80 埠
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
