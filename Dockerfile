FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies (npm install will create/update package-lock.json if needed)
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 4173

# Set PORT environment variable
ENV PORT=4173

# Start the application
CMD ["npm", "start"]
