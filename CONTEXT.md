# Project Context

## Purpose

This project is a web application for managing and using UTBK preparation questions.

Its first scope is:

- managing a bank of questions;
- grouping questions by subject and topic;
- building exercise packages;
- allowing students to complete exercises;
- showing results and explanations.

## Glossary

### Subject

A top-level UTBK material area, such as `TPS`, `Literasi Bahasa Indonesia`, `Literasi Bahasa Inggris`, or `Penalaran Matematika`.

### Topic

A material grouping under a `Subject`. A `Topic` is used to organize questions into a structure that is easier to search, review, and package.

### Question

The core assessment item stored in the question bank. A `Question` includes its prompt, answer options, correct answer, difficulty, source, and publication status.

### Question Explanation

The explanation attached to a `Question` that helps a student understand why an answer is correct or incorrect.

### Question Package

A curated set of questions assembled for student practice. A `Question Package` is a reusable container and is distinct from a student's actual work session.

### Attempt

A single student's work session on one `Question Package`. An `Attempt` starts when the student begins and ends when the student submits.

### Attempt Answer

A student's recorded answer for one question inside an `Attempt`.

### Result

The evaluated outcome of an `Attempt`, including score, counts of correct and incorrect answers, and access to explanations.

### Admin

A user role responsible for system-level management, including users and global data.

### Editor

A user role responsible for creating, editing, reviewing, and publishing question content.

### Student

A user role responsible for consuming `Question Packages`, completing `Attempts`, and viewing `Results`.
