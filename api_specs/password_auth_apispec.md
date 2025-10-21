# API Specification: PasswordAuthentication Concept

**Purpose:** limit access to known users

---

## API Endpoints

### POST /api/PasswordAuthentication/register

**Description:** Registers a new user with a unique username and a password.

**Requirements:**
- username to not already exist in the set of Users

**Effects:**
- creates a new user of that username and password, adds that user to the set of users, and returns the new user

**Request Body:**
```json
{
  "username": "String",
  "password": "String"
}
```

**Success Response Body (Action):**
```json
{
  "user": "User"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

### POST /api/PasswordAuthentication/authenticate

**Description:** Authenticates an existing user using their username and password.

**Requirements:**
- user of the argument username and password to exist in the set of Users

**Effects:**
- returns the corresponding User

**Request Body:**
```json
{
  "username": "String",
  "password": "String"
}
```

**Success Response Body (Action):**
```json
{
  "user": "User"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---