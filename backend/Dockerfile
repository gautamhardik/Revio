FROM node:20-alpine

WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY src ./src

# Expose port
EXPOSE 4000

# Start server
CMD ["npm", "start"]
