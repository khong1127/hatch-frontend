# hatch-frontend

This is a Vue.js application built with Vite, TypeScript, Vue Router, and Pinia.

## Visual Design Study

Link here: https://docs.google.com/presentation/d/1Epd9k1jtK1fbcsAAzmvpeTw9w_uV0zaNtkffKiSIWwI/edit?usp=sharing

With color, I indeed stuck with paler / neutral colors that I felt were more calming. I did consider using warmer colors but settled for a paler green since green is the general universal color of nature, which matches my concept of birding.

With typography, I ultimately didn't settle for what I researched. I felt that handwritten fonts could look less professional for an app (compared to an album cover where I feel that it is more acceptable for the creator AKA artist to add a personal touch). I tried a few different capitalized fonts but felt that they contradicted the softer feel that I wanted to go with. As for cursive fonts, I felt that they decreased legibility.

## User Journey

Alex decides to install the Hatch app with his other friends. They all register themselves as a user and add each other as friends. One Saturday morning, Alex heads to the local wetlands for a birding trip. On the app’s home screen, Alex taps “Start Trip" to begin a new session. As he walks along the trail, he spots a Great Blue Heron standing in the shallow waters. Excited, Alex taps the “Log a Bird” button to snap a picture. The photo is then automatically logged to his active trip session. Over the next hour, Alex adds several more sightings. When Alex finishes, he taps “End Session," and the app prompts him to write a caption. Alex types: “A peaceful morning at the wetlands :D". The session is then automatically turned into a post that appears in the feed of Alex’s birding friends and in Alex's profile. Later that afternoon, one of Alex’s friends, Maya, opens the app and sees Alex’s trip post on her home feed. She leaves a comment: “Beautiful shot of the heron!” Another friend adds, “I'm so jealous, I haven't spotted a kingfisher in person myself yet!” Since posting and commenting are limited to friends, Alex feels safe sharing his sightings.

## Notes about User Journey Recording

Old: https://drive.google.com/file/d/1nFfPtLyAO-kgpr5AhF005CgD3q-tNClP/view?usp=drive_link

New: https://drive.google.com/file/d/1SAVLMPNKdDUR3nYDmUlxShfI7yH9O-Zt/view?usp=drive_link

Notably, you will see that nothing is stopping a user from posting non-bird pictures. This can seem odd considering that the app is designed for bird logging, but here are some notes:

1) Verifying that a picture is indeed of a bird is not a simple task. AI could be used for verification, but that is expensive.

2) It is not unreasonable if, say, someone wanted to add a selfie of themselves at the end of their bird trip as part of their post.

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
npm run test:unit
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
