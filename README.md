## Soma Capital Technical Assessment

This is a technical assessment as part of the interview process for Soma Capital.

> [!IMPORTANT]  
> You will need a Pexels API key to complete the technical assessment portion of the application. You can sign up for a free API key at https://www.pexels.com/api/  

To begin, clone this repository to your local machine.

## Development

This is a [NextJS](https://nextjs.org) app, with a SQLite based backend, intended to be run with the LTS version of Node.

To run the development server:

```bash
npm i
npm run dev
```

## Task:

Modify the code to add support for due dates, image previews, and task dependencies.

### Part 1: Due Dates 

When a new task is created, users should be able to set a due date.

When showing the task list is shown, it must display the due date, and if the date is past the current time, the due date should be in red.

### Part 2: Image Generation 

When a todo is created, search for and display a relevant image to visualize the task to be done. 

To do this, make a request to the [Pexels API](https://www.pexels.com/api/) using the task description as a search query. Display the returned image to the user within the appropriate todo item. While the image is being loaded, indicate a loading state.

You will need to sign up for a free Pexels API key to make the fetch request. 

### Part 3: Task Dependencies

Implement a task dependency system that allows tasks to depend on other tasks. The system must:

1. Allow tasks to have multiple dependencies
2. Prevent circular dependencies
3. Show the critical path
4. Calculate the earliest possible start date for each task based on its dependencies
5. Visualize the dependency graph

## Submission:

1. Add a new "Solution" section to this README with a description and screenshot or recording of your solution. 
2. Push your changes to a public GitHub repository.
3. Submit a link to your repository in the application form.

Thanks for your time and effort. We'll be in touch soon!

---

## Solution

```bash
cp .env.example .env.local   # add your Pexels API key
npm install && npx prisma migrate dev && npm run dev
```

### Due dates

Added a nullable `dueDate` field to the Todo model. The create form has a native date picker next to the title input. On each card, the due date shows as a small badge — if it's past today it turns red so overdue tasks are obvious at a glance.

### Image previews

When you create a todo, the POST handler searches Pexels server-side using the title as the query and saves the image URL on the record. I did it this way rather than calling Pexels from the client so the API key never leaves the server. The form shows a spinner while the request is in flight. If Pexels doesn't return anything (or errors out), the todo still gets created — it just won't have an image.

### Dependencies

This was the interesting part. I used an explicit join table (`TodoDependency`) rather than Prisma's implicit many-to-many so I could set up cascade deletes — when you delete a task, its dependency edges get cleaned up automatically.

Each card shows what it depends on (with remove buttons) and what it blocks, so you can see both directions of the relationship.

Cycle detection happens at write time: when you try to add an edge A→B, the server runs a DFS from B through the existing graph. If it can reach A, the request gets rejected with a 400 that includes the exact cycle path. I went with write-time validation rather than read-time so the graph can never be in a bad state.

For the critical path I implemented standard CPM in `lib/critical-path.ts` — topological sort via Kahn's algorithm, then a forward pass to get earliest start/finish times and a backward pass for latest start/finish. Tasks where the slack (latest start minus earliest start) is zero are on the critical path. Due dates act as the finish constraint, and tasks without one default to a 1-day duration. These values are all computed on each GET request rather than stored in the database since they're derived from the graph structure and would go stale otherwise.

The graph visualization uses ReactFlow with dagre for automatic layout. It appears below the task list once you've added at least one dependency. Critical path nodes and edges are highlighted in amber, and overdue nodes get a red border.

### Screenshot

<!-- Add screenshot here -->
