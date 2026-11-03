# StudioSpace — Backend Server

StudioSpace is a creative studio booking platform backend built with Express.js and MongoDB. It provides APIs for studio management, bookings, reviews, and ratings.

## Features

- **Studio Management:** Create, retrieve, update, and delete studio listings.
- **Studio Discovery:** Retrieve all studios and featured studios.
- **Booking Management:** Create and manage studio bookings.
- **Booking Validation:** Prevent overlapping bookings for the same studio when an existing booking is confirmed.
- **Authentication:** Verify authenticated users using JWT.
- **Protected Routes:** Secure studio creation, deletion, and booking operations.
- **Reviews & Ratings:** Submit reviews and ratings for studios.
- **Review Management:** Allow a user to update their existing review for the same studio.
- **Rating Calculation:** Maintain studio rating averages and review counts.
- **MongoDB Integration:** Store studio, booking, and review data in MongoDB.

## Technologies Used

- Node.js
- Express.js
- MongoDB
- JavaScript
- Better Auth JWT integration

## Project Structure

```text
Cat-Harry-server/
├── index.js
├── package.json
├── package-lock.json
└── .env
```

## Installation and Setup

### 1. Clone the repository

```bash
git clone YOUR_SERVER_REPOSITORY_URL
cd Cat-Harry-server
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the server root directory.

Add the required MongoDB connection URL and authentication-related configuration using the same variable names referenced in the server code.

Never commit database credentials, secret keys, or other sensitive values to GitHub.

### 4. Start the server

```bash
node index.js
```

The server runs on port 5000.

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| GET | `/studios` | Retrieve studios |
| GET | `/studios/featured` | Retrieve featured studios |
| POST | `/studios` | Create a studio |
| DELETE | `/studios/:id` | Delete a studio |
| POST | `/studios/:id/reviews` | Submit or update a review |
| GET | `/studios/:id/reviews` | Retrieve studio reviews |
| POST | `/bookings` | Create a booking |

Protected endpoints require a valid authentication token.

## Database

MongoDB is used to store application data, including:

- Studios
- Bookings
- Reviews

Reviews use a unique combination of studio ID and user email to prevent duplicate reviews by the same user for the same studio.

## Running Locally

Start the backend server:

```bash
node index.js
```

The API will be available at:

`http://localhost:5000`

## License

This project was developed as part of an academic assignment.