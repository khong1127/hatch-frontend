# API Specification: PasswordAuthentication Concept

**Purpose:** limit access to known users

***

## API Endpoints

### POST /api/PasswordAuthentication/register

**Description:** Registers a new user with a unique username and password.

**Requirements:**

* username to not already exist in the set of Users

**Effects:**

* creates a new user of that username and password
* adds that user to the set of users
* returns the new user

**Request Body:**

```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response Body (Action):**

```json
{
  "user": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/PasswordAuthentication/authenticate

**Description:** Authenticates a user with the provided username and password.

**Requirements:**

* user of the argument username and password to exist in the set of Users

**Effects:**

* returns the corresponding User

**Request Body:**

```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response Body (Action):**

```json
{
  "user": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/PasswordAuthentication/changePassword

**Description:** Changes the password for an existing user.

**Requirements:**

* user must exist

**Effects:**

* updates the password for the specified user

**Request Body:**

```json
{
  "user": "string",
  "newPassword": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/PasswordAuthentication/_getUserByUsername

**Description:** Retrieves a user's full document by their username.

**Requirements:**

* (Implicit: username argument must be provided)

**Effects:**

* returns an array containing the user document if found, otherwise an empty array.

**Request Body:**

```json
{
  "username": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "user": {
      "_id": "string",
      "username": "string",
      "password": "string"
    }
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/PasswordAuthentication/_getUserById

**Description:** Retrieves a user's full document by their ID.

**Requirements:**

* (Implicit: id argument must be provided)

**Effects:**

* returns an array containing the user document if found, otherwise an empty array.

**Request Body:**

```json
{
  "id": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "user": {
      "_id": "string",
      "username": "string",
      "password": "string"
    }
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/PasswordAuthentication/_getAllUsers

**Description:** Retrieves all user documents in the system.

**Requirements:**

* true

**Effects:**

* returns an array of all user documents.

**Request Body:**

```json
{}
```

**Success Response Body (Query):**

```json
[
  {
    "user": {
      "_id": "string",
      "username": "string",
      "password": "string"
    }
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/PasswordAuthentication/_userExistsById

**Description:** Checks if a user with the given ID exists.

**Requirements:**

* true

**Effects:**

* returns an array containing `{"exists": true}` if a user with the given ID exists, otherwise an empty array `[]`

**Request Body:**

```json
{
  "user": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "exists": "boolean"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/PasswordAuthentication/_userExistsByUsername

**Description:** Checks if a user with the given username exists.

**Requirements:**

* true

**Effects:**

* returns an array containing `{"exists": true}` if a user with the given username exists, otherwise an empty array `[]`

**Request Body:**

```json
{
  "username": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "exists": "boolean"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

# API Specification: Commenting Concept

**Purpose:** enable discussion around shared posts

***

## API Endpoints

### POST /api/Commenting/addComment

**Description:** Creates a new comment authored by a user under a specific post.

**Requirements:**
- author and post must exist (implicitly handled by syncs providing valid IDs)
- author must have visibility of the post (implicitly handled by syncs)
- content cannot be empty

**Effects:**
- creates a comment authored by the user under the post with the text content

**Request Body:**
```json
{
  "author": "string",
  "content": "string",
  "post": "string"
}
```

**Success Response Body (Action):**
```json
{
  "comment": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

### POST /api/Commenting/deleteComment

**Description:** Deletes a comment if the requesting user is its author.

**Requirements:**
- comment must exist
- comment must belong to the user

**Effects:**
- deletes the comment

**Request Body:**
```json
{
  "user": "string",
  "comment": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

### POST /api/Commenting/editComment

**Description:** Edits the content of an existing comment if the requesting user is its author.

**Requirements:**
- comment must exist
- comment must belong to the user
- new_content cannot be empty

**Effects:**
- edits the comment content to be that of new_content

**Request Body:**
```json
{
  "user": "string",
  "comment": "string",
  "new_content": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

### POST /api/Commenting/_getComment

**Description:** Retrieves the full details of a specific comment by its ID.

**Requirements:**
- (Implicit: comment ID must be provided)

**Effects:**
- Query to retrieve a specific comment. Returns an array for consistency with other queries.

**Request Body:**
```json
{
  "comment": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "comment": {
      "_id": "string",
      "author": "string",
      "content": "string",
      "post": "string",
      "createdAt": "date-time"
    }
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

### POST /api/Commenting/_getCommentsForPost

**Description:** Retrieves all comments associated with a given post, sorted from most recent to oldest.

**Requirements:**
- (Implicit: post ID must be provided)

**Effects:**
- Query to retrieve all comments for a given post, sorted from most recent to oldest.

**Request Body:**
```json
{
  "post": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "comment": {
      "_id": "string",
      "author": "string",
      "content": "string",
      "post": "string",
      "createdAt": "date-time"
    }
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

### POST /api/Commenting/_getCommentsByAuthor

**Description:** Retrieves all comments made by a specific user, sorted from most recent to oldest.

**Requirements:**
- (Implicit: author ID must be provided)

**Effects:**
- Query to retrieve all comments made by a given user, sorted from most recent to oldest.

**Request Body:**
```json
{
  "author": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "comment": {
      "_id": "string",
      "author": "string",
      "content": "string",
      "post": "string",
      "createdAt": "date-time"
    }
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

# API Specification: Posting Concept

**Purpose:** allow users to publish and share content for others to see

***

## API Endpoints

### POST /api/Posting/create

**Description:** Creates a new post authored by a user, including a caption and at least one image.

**Requirements:**
- user to exist
- images cannot be empty

**Effects:**
- creates a new post authored by the user with its content being the caption and images given.

**Request Body:**
```json
{
  "user": "string",
  "images": [
    "string"
  ],
  "caption": "string"
}
```

**Success Response Body (Action):**
```json
{
  "post": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
***
### POST /api/Posting/delete

**Description:** Deletes a post if the requesting user is its author.

**Requirements:**
- user to exist
- post to exist and belong to user

**Effects:**
- deletes the post.

**Request Body:**
```json
{
  "user": "string",
  "post": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
***
### POST /api/Posting/edit

**Description:** Edits the caption of an existing post if the requesting user is its author.

**Requirements:**
- user to exist
- post to exist and belong to user

**Effects:**
- edits the caption of the post to be that of the new one.

**Request Body:**
```json
{
  "user": "string",
  "post": "string",
  "new_caption": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
***
### POST /api/Posting/getFeedForUser

**Description:** Retrieves a feed of posts from the user's friends, sorted from most recent to oldest.

**Requirements:**
- user exists

**Effects:**
- returns an array of posts from the user's friends, sorted by most recent

**Request Body:**
```json
{
  "user": "string"
}
```

**Success Response Body (Action):**
```json
{
  "posts": [
    {
      "_id": "string",
      "author": "string",
      "caption": "string",
      "images": ["string"],
      "createdAt": "date-time"
    }
  ]
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
***
### POST /api/Posting/_getPostById

**Description:** Retrieves the full details of a specific post by its ID.

**Requirements:**
- post exists

**Effects:**
- Returns the details of a specific post as an array.

**Request Body:**
```json
{
  "post": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "postDetails": {
      "_id": "string",
      "caption": "string",
      "images": [
        "string"
      ],
      "author": "string",
      "createdAt": "date-time"
    }
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
***
### POST /api/Posting/_getPostsByAuthor

**Description:** Retrieves all posts authored by a specific user, sorted from most recent to oldest.

**Requirements:**
- user exists

**Effects:**
- Returns all posts authored by a specific user from most recent to oldest.

**Request Body:**
```json
{
  "user": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "post": {
      "_id": "string",
      "caption": "string",
      "images": [
        "string"
      ],
      "author": "string",
      "createdAt": "date-time"
    }
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

# API Specification: Friending Concept

**Purpose:** allow users to add each other as friends to share information with

***

## API Endpoints

### POST /api/Friending/sendRequest

**Description:** Sends a friend request from a sender to a receiver.

**Requirements:**
- The sender cannot be the same as the receiver.
- A friend request from the sender to the receiver must not already exist.
- A friend request from the receiver to the sender must not already exist.
- A friendship between the sender and receiver must not already exist.

**Effects:**
- Creates a new friend request from the sender to the receiver.
- Returns the ID of the newly created friend request.

**Request Body:**
```json
{
  "sender": "string",
  "receiver": "string"
}
```

**Success Response Body (Action):**
```json
{
  "request": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
***

### POST /api/Friending/acceptRequest

**Description:** Accepts an existing friend request, creating a mutual friendship.

**Requirements:**
- A friend request from the sender to the receiver must exist.

**Effects:**
- Removes the friend request between the sender and receiver.
- Creates a new friendship between the sender and receiver.

**Request Body:**
```json
{
  "sender": "string",
  "receiver": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
***

### POST /api/Friending/denyRequest

**Description:** Denies and removes an existing friend request.

**Requirements:**
- A friend request from the sender to the receiver must exist.

**Effects:**
- Removes the friend request between the sender and receiver.

**Request Body:**
```json
{
  "sender": "string",
  "receiver": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
***

### POST /api/Friending/removeFriend

**Description:** Removes an existing friendship between two users.

**Requirements:**
- A friendship between the user and the `to_be_removed_friend` must exist.

**Effects:**
- Removes the friendship between the user and the `to_be_removed_friend`.

**Request Body:**
```json
{
  "user": "string",
  "to_be_removed_friend": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
***

### POST /api/Friending/_isFriends

**Description:** Checks if two users are friends.

**Requirements:**
- `user1` and `user2` must be valid user IDs.

**Effects:**
- Returns an array containing a single object with a boolean field `areFriends` indicating the friendship status.

**Request Body:**
```json
{
  "user1": "string",
  "user2": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "areFriends": true
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
***

### POST /api/Friending/_getFriends

**Description:** Retrieves a list of friend IDs for a given user.

**Requirements:**
- `user` must be a valid user ID.

**Effects:**
- Returns an array of objects, where each object contains the ID of a friend in a `friend` field. Returns an empty array if the user has no friends.

**Request Body:**
```json
{
  "user": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "friend": "string"
  },
  {
    "friend": "string"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
***

### POST /api/Friending/_getSentFriendRequests

**Description:** Retrieves a list of users to whom the given user has sent a friend request.

**Requirements:**
- `sender` must be a valid user ID.

**Effects:**
- Returns an array of objects, where each object contains the ID of a request receiver in a `receiver` field. Returns an empty array if the user has no pending sent requests.

**Request Body:**
```json
{
  "sender": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "receiver": "string"
  },
  {
    "receiver": "string"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
***

### POST /api/Friending/_getReceivedFriendRequests

**Description:** Retrieves a list of users who have sent a friend request to the given user.

**Requirements:**
- `receiver` must be a valid user ID.

**Effects:**
- Returns an array of objects, where each object contains the ID of a request sender in a `sender` field. Returns an empty array if the user has no pending received requests.

**Request Body:**
```json
{
  "receiver": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "sender": "string"
  },
  {
    "sender": "string"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

# API Specification: SessionLogging Concept

**Purpose:** capture photo records of a user's activity during a trip session

---

## API Endpoints

### POST /api/SessionLogging/startSession

**Description:** Creates a new, active session for the specified user.

**Requirements:**
- The provided `user` must exist.

**Effects:**
- Creates a new session associated with the `user`.
- The new session is marked as `active`.
- Returns the unique ID of the newly created session.

**Request Body:**
```json
{
  "user": "string"
}
```

**Success Response Body (Action):**
```json
{
  "session": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/SessionLogging/addEntry

**Description:** Adds an image to an active session owned by the user.

**Requirements:**
- The `user`, `session`, and `image` must all exist.
- The session must be `active`.
- The session must be owned by the `user`.
- The image must not already be in the session's image set.

**Effects:**
- Adds the `image` ID to the set of images for the specified `session`.

**Request Body:**
```json
{
  "user": "string",
  "session": "string",
  "image": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/SessionLogging/endSession

**Description:** Deactivates a session, preventing new entries from being added.

**Requirements:**
- The `user` and `session` must exist.
- The session must be owned by the `user`.
- The session must currently be `active`.

**Effects:**
- Sets the `active` status of the session to `false`.

**Request Body:**
```json
{
  "user": "string",
  "session": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/SessionLogging/_getSessionsByUser

**Description:** Retrieves all session IDs owned by a specific user.

**Requirements:**
- A valid `user` ID must be provided.

**Effects:**
- Returns a list of objects, each containing a session ID owned by the user.

**Request Body:**
```json
{
  "user": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "session": "string"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/SessionLogging/_getSessionDetails

**Description:** Retrieves the complete details for a specific session.

**Requirements:**
- A valid `session` ID must be provided.

**Effects:**
- Returns an array containing a single object with the session's details, or an empty array if not found.

**Request Body:**
```json
{
  "session": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "_id": "string",
    "owner": "string",
    "images": [
      "string"
    ],
    "active": "boolean"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/SessionLogging/_getEntriesInSession

**Description:** Retrieves all image IDs associated with a specific session.

**Requirements:**
- A valid `session` ID must be provided.

**Effects:**
- Returns a list of objects, each containing an image ID from the session.

**Request Body:**
```json
{
  "session": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "image": "string"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/SessionLogging/_isSessionActive

**Description:** Checks if a specific session is currently active.

**Requirements:**
- A valid `session` ID must be provided.

**Effects:**
- Returns an array containing a single object with the session's active status, or an empty array if not found.

**Request Body:**
```json
{
  "session": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "active": "boolean"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

# API Specification: File Concept

**Purpose:** Manage user-owned files, supporting secure upload, storage, and retrieval of content.

***

## API Endpoints

### POST /api/File/requestUploadUrl

**Description:** Requests a time-limited, signed URL for securely uploading a file to cloud storage.

**Requirements:**
- `user` ID must be provided.
- `filename` must be provided.
- The `GCS_BUCKET` environment variable must be set on the server.

**Effects:**
- Generates a new, time-limited, signed PUT URL valid for uploading a file to the configured cloud storage bucket.
- Returns the `uploadUrl`, the target `bucket` name, and the generated `object` path for the file.

**Request Body:**
```json
{
  "user": "string",
  "filename": "string",
  "contentType": "string",
  "expiresInSeconds": "number"
}
```

**Success Response Body (Action):**
```json
{
  "uploadUrl": "string",
  "bucket": "string",
  "object": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/File/confirmUpload

**Description:** Confirms a successful file upload by recording its metadata in the system.

**Requirements:**
- `user` ID must be provided.
- `object` path (from `requestUploadUrl`) must be provided.
- The `GCS_BUCKET` environment variable must be set on the server.

**Effects:**
- Creates a new `FileId` and stores a new file document in the database, associating it with the `user`, `bucket`, `object` path, `contentType`, `size`, and `createdAt` timestamp.
- Returns the newly created `file` ID and a direct public `url` to the stored file.

**Request Body:**
```json
{
  "user": "string",
  "object": "string",
  "contentType": "string",
  "size": "number"
}
```

**Success Response Body (Action):**
```json
{
  "file": "string",
  "url": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/File/getViewUrl

**Description:** Provides a time-limited, signed URL for securely viewing an existing file.

**Requirements:**
- `user` ID must be provided.
- `object` path must be provided.
- The `GCS_BUCKET` environment variable must be set on the server.

**Effects:**
- Generates a new, time-limited, signed GET URL for the specified `object` in the configured cloud storage bucket.
- Returns the generated `url` for viewing the file.
- *Note: This action does not perform access control; it assumes the caller is authorized to view the file.*

**Request Body:**
```json
{
  "user": "string",
  "object": "string",
  "expiresInSeconds": "number"
}
```

**Success Response Body (Action):**
```json
{
  "url": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/File/_getFileById

**Description:** Retrieves the metadata for a specific file by its unique ID.

**Requirements:**
- `file` ID must be provided.

**Effects:**
- Returns an array containing a single object, where the `file` key holds the `FileDocument` metadata if found.
- Returns an empty array if no file with the given ID exists.

**Request Body:**
```json
{
  "file": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "file": {
      "_id": "string",
      "owner": "string",
      "bucket": "string",
      "object": "string",
      "contentType": "string",
      "size": "number",
      "createdAt": "string"
    }
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/File/_getFilesByOwner

**Description:** Retrieves a list of all file metadata documents owned by a specific user.

**Requirements:**
- `user` ID must be provided.

**Effects:**
- Returns an array containing a single object. This object has a `files` key, whose value is an array of `FileDocument`s associated with the given `user`, sorted by creation date (newest first).
- Returns an array containing a single object with an empty `files` array if the user has no files.

**Request Body:**
```json
{
  "user": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "files": [
      {
        "_id": "string",
        "owner": "string",
        "bucket": "string",
        "object": "string",
        "contentType": "string",
        "size": "number",
        "createdAt": "string"
      }
    ]
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---