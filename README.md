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

### Running it

```bash
cp .env.example .env.local   # add your Pexels API key
npm install
npx prisma migrate dev
npm run dev
```

### What I built

**Due dates** — date picker in the create form, dates show as badges on each card, overdue ones turn red.

**Pexels images** — the Pexels search happens server-side during todo creation (keeps the API key off the client). If it fails or returns nothing, the todo still gets created, just without an image. The form shows a spinner while the POST + Pexels round-trip completes.

**Dependencies** — this was the interesting part. I added a `TodoDependency` join table (explicit rather than Prisma's implicit many-to-many, so I have control over cascade deletes). Each card shows what it depends on and what it blocks.

For cycle prevention, when you try to add an edge A→B, the server does a DFS from B through existing deps. If it can reach A, the edge would create a cycle and gets rejected with a message showing the exact cycle path. Self-references are caught with a simpler check before the DFS even runs.

For the critical path, I implemented the standard CPM algorithm (`lib/critical-path.ts`): topological sort via Kahn's, then a forward pass for earliest start/finish and a backward pass for latest start/finish. Tasks with zero slack are on the critical path. Due dates act as the finish constraint; tasks without one default to a 1-day duration. These values are computed on every GET, never stored — they're derived data.

The dependency graph uses ReactFlow with dagre for auto-layout. It shows up automatically below the task list once dependencies exist. Critical path nodes/edges are highlighted in amber, overdue nodes get red borders, and there's a legend in the corner.

### Screenshot

<!-- Add screenshot here -->
