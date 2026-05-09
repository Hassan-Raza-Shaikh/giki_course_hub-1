# GIKI Course Hub - Project Flowcharts

This document illustrates the logical flow of the GIKI Course Hub platform, following standard flowchart conventions.

## 1. Main Student User Journey
This flowchart shows the process from opening the platform to accessing course materials.

```mermaid
flowchart LR
    %% Styles
    classDef start fill:#f97316,stroke:#ea580c,color:#fff,stroke-width:2px;
    classDef action fill:#c084fc,stroke:#9333ea,color:#fff,stroke-width:2px;
    classDef decision fill:#38bdf8,stroke:#0284c7,color:#fff,stroke-width:2px;
    classDef system fill:#4ade80,stroke:#16a34a,color:#fff,stroke-width:2px;

    Start([Open GIKI Course Hub]) --> Landing[Show Landing Page]
    class Start start
    class Landing action

    Landing --> Choice1{Want to browse?}
    class Choice1 decision

    Choice1 -- Yes --> Explore[Show Faculties & Programs]
    class Explore action
    
    Explore --> Choice2{Select Faculty?}
    class Choice2 decision
    
    Choice2 -- Yes --> Courses[Show Course List]
    class Courses action
    
    Courses --> Choice3{Select Course?}
    class Choice3 decision
    
    Choice3 -- Yes --> Materials[Show Materials Page]
    class Materials action

    Materials --> Choice4{Download/View?}
    class Choice4 decision
    
    Choice4 -- Yes --> Storage[Request File from R2 Storage]
    class Storage system
    
    Storage --> Success([Access Granted])
    class Success start
```

## 2. Contribution & Moderation Flow
This flowchart shows how student contributions are handled by the system and administrators.

```mermaid
flowchart TD
    %% Styles
    classDef start fill:#f97316,stroke:#ea580c,color:#fff,stroke-width:2px;
    classDef action fill:#c084fc,stroke:#9333ea,color:#fff,stroke-width:2px;
    classDef decision fill:#38bdf8,stroke:#0284c7,color:#fff,stroke-width:2px;
    classDef system fill:#4ade80,stroke:#16a34a,color:#fff,stroke-width:2px;

    UploadStart([Decide to Contribute]) --> AuthCheck{Logged In?}
    class UploadStart start
    class AuthCheck decision

    AuthCheck -- No --> Login[Google Sign-In]
    class Login action
    
    AuthCheck -- Yes --> Form[Select Course & Category]
    Login --> Form
    class Form action

    Form --> FileSelection[Upload File/Binary]
    class FileSelection action

    FileSelection --> API[Backend Verification]
    class API system

    API --> ModQueue[Admin Moderation Queue]
    class ModQueue action

    ModQueue --> ModDecision{Is Content Valid?}
    class ModDecision decision

    ModDecision -- No --> Reject[Reject & Log Reason]
    class Reject action

    ModDecision -- Yes --> Approve[sp_approve_file]
    class Approve system

    Approve --> Live[Live on Platform]
    class Live action
```

## 3. Platform Hierarchy
A high-level view of how data is organized within the system.

```mermaid
graph TD
    classDef node fill:#f0f9ff,stroke:#0ea5e9,stroke-width:2px;

    Admin((Admin)) --> Manage[Manage Content]
    
    Faculty[Faculty\ne.g. FCSE] --> Program[Program\ne.g. Computer Science]
    class Faculty,Program node

    Program --> Year[Academic Year]
    class Year node

    Year --> Semester[Semester]
    class Semester node

    Semester --> Course[Course\ne.g. Data Structures]
    class Course node

    Course --> Categories[Categories\ne.g. Notes, Past Papers, Slides]
    class Categories node
```
