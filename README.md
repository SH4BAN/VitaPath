# SAFE - Smart Preventive Family Health Intelligence System

SAFE is a digital child health platform designed to centralize preventive healthcare records for children aged 0 to 18.

The main goal of SAFE is simple: no child should be missed from preventive care. The platform helps parents, nurses, doctors, administrators, and municipality health teams track vaccinations, routine check-ups, appointments, home visits, development milestones, notifications, and children who may need closer follow-up.

## Project Context

SAFE combines two challenge areas into one complete project.

The first challenge is child preventive health monitoring: helping families and healthcare providers track vaccinations, check-ups, milestones, reminders, and missed or delayed care.

The second challenge is public health visibility: helping municipalities and healthcare institutions understand care gaps, vaccination coverage, high-risk children, healthcare worker workload, and weekly trends across a population.

Together, these two challenges create one connected system that supports both individual family care and broader public health decision-making.

## Problem

Child health data is often fragmented, paper-based, or stored across disconnected systems. Parents may not always know which vaccines are completed, which appointments are upcoming, or which check-ups are overdue.

At the same time, healthcare providers and municipalities may lack clear visibility into children who missed preventive care, families who need follow-up, or areas with lower vaccination coverage.

SAFE solves this by bringing the data into one organized platform.

## Main Users

Parents use SAFE to manage their children’s health records, view appointments, receive reminders, confirm or reschedule appointments, communicate with providers, and access a clear health timeline.

Nurses and doctors use SAFE to manage assigned families, schedule appointments, complete home visit forms, review child health records, communicate with parents, and monitor children who need preventive follow-up.

Admins use SAFE to manage users, connect parents with providers, monitor system activity, and support care coordination.

Municipality users use SAFE to monitor population-level health data, vaccination coverage, high-risk cases, overdue care, workforce activity, and AI-generated weekly reports.

## Key Features

SAFE supports child profile management, allowing each parent to add one or more children. Every child has an individual health record that includes vaccinations, check-ups, development milestones, appointments, home visits, and timeline events.

The appointment system allows providers to schedule visits for vaccination, routine check-ups, home visits, dental screening, or other health needs. Parents can view upcoming and past appointments, confirm attendance, request a new time, or mark that they cannot attend.

The platform includes notifications and email support for important events such as new appointments, reminders, registration, provider assignment, and missed or delayed care.

SAFE also includes real-time messaging between parents and their assigned provider, as well as support communication with the admin.

## Health Timeline

Each child has a health timeline that shows important events in one place. This includes completed vaccinations, scheduled vaccinations, check-ups, milestones, appointments, home visits, and missed care.

This helps both parents and providers quickly understand the child’s preventive care history.

## Home Visit Workflow

The home visit form allows nurses or doctors to record visit details such as temperature, weight, height, symptoms, notes, risk level, recommended actions, and follow-up needs.

If needed, the provider can create a follow-up appointment directly from the home visit workflow.

## Health Passport

SAFE includes a digital Health Passport for each child. The passport summarizes the child’s key health information, including vaccinations, check-ups, milestones, appointments, recent visits, and current risk level.

It also supports QR-based verification, so a healthcare provider can quickly access a temporary verified view of the child’s health passport.

## AI Features

SAFE includes multiple AI-supported features.

AI Risk Detection analyzes preventive health data such as missed vaccines, delayed check-ups, appointments, home visits, milestones, and provider notes. It generates a risk summary, key reasons, urgency level, recommended actions, parent-friendly message, and provider notes.

The AI does not replace doctors and does not provide a diagnosis. It acts as a decision-support tool to help identify children who may need earlier follow-up.

The AI Health Assistant helps parents ask questions about their child’s vaccinations, appointments, milestones, and preventive care status using the child’s real data from the platform.

The AI Weekly Report helps municipality users generate a weekly public health summary with key findings, risk trends, vaccination coverage, workforce activity, and urgent recommended actions.

## Municipality Monitoring

The Municipality Monitor gives institutions a broader view of preventive child healthcare. It shows total registered children, vaccination coverage, check-up coverage, risk distribution, high-risk children, overdue vaccinations, upcoming appointments, and healthcare worker workload.

This makes SAFE useful not only for individual families, but also for public health planning.

## Parent and Provider Assignment

SAFE supports a care team model where a parent or family can be assigned to a nurse or doctor. One provider can manage multiple families, while each parent has a clear care contact inside the platform.

This makes the workflow more realistic and closer to how preventive healthcare is coordinated in practice.

## Technical Overview

SAFE is built as a full-stack web application.

The frontend is built with React and Vite. It provides separate role-based portals for parents, doctors, admins, and municipality users.

The backend is built with Node.js and Express. It exposes REST API endpoints for authentication, children, vaccinations, check-ups, milestones, appointments, home visits, messages, notifications, settings, risk analysis, health passport, municipality monitoring, and AI features.

The database is PostgreSQL, hosted through Supabase. Data is organized into structured tables such as users, children, care assignments, vaccinations, checkups, milestones, appointments, home visits, messages, notifications, email outbox, risk assessments, settings, and audit logs.

Authentication uses JWT, and access is role-based. The system supports parent, doctor, admin, and municipality roles.

Real-time communication is supported with Socket.IO for chat. Email notifications are supported through SMTP, with an email outbox used for tracking sent, failed, or skipped email delivery.

AI features are integrated through external AI APIs, including OpenAI for structured preventive risk analysis and an AI assistant/reporting workflow for parent and municipality support.

## Why SAFE Matters

SAFE helps reduce missed vaccinations, delayed check-ups, forgotten appointments, and disconnected communication between parents and healthcare providers.

It gives parents a clearer understanding of their child’s preventive care, helps providers prioritize follow-up, and gives municipalities better visibility into public health gaps.

## Vision

The vision of SAFE is to create a connected preventive healthcare system where families, providers, and institutions work together using shared, organized, and intelligent health data.

The final goal is:

No child should be missed from preventive care.

## Tech Stack

SAFE is built as a full-stack web application.

### Frontend
The frontend is built with React and Vite. It provides role-based interfaces for parents, doctors, admins, and municipality users.

Main frontend technologies:
- React
- Vite
- TypeScript
- Tailwind CSS
- Lucide React icons
- Recharts for dashboards and charts
- Socket.IO Client for real-time chat

### Backend
The backend is built with Node.js and Express. It provides REST API endpoints that connect the frontend with the database and handle the main system logic.

Main backend technologies:
- Node.js
- Express.js
- PostgreSQL
- Supabase PostgreSQL
- JWT authentication
- bcrypt for password hashing
- Socket.IO for real-time messaging
- Nodemailer for email notifications
- OpenAI API for AI risk analysis

### Database
The project uses PostgreSQL as the main database. In this version, the database is hosted on Supabase.

The database stores:
- users
- children
- care assignments
- vaccinations
- check-ups
- development milestones
- appointments
- home visits
- messages
- notifications
- email outbox
- risk assessments
- settings
- audit logs

### Contributors

This project was developed collaboratively by the team members below:

- Sarah Hajrizi
- Agnesa Baliu
- Fatlum Mehmeti
- Elion Mustafa
- Lerdi Salihi

Each team member contributed to different parts of the project, including frontend development, backend development, database design, AI features, system logic, documentation, and testing.

## How to Run the Project

### 1. Install dependencies

```bash
npm install


