FROM nginx:alpine

COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

COPY apps/frontend/dist /usr/share/nginx/html

EXPOSE 8001

CMD ["nginx", "-g", "daemon off;"]
