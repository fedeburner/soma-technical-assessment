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

### Setup

```bash
git clone https://github.com/fedeburner/soma-technical-assessment.git
cd soma-technical-assessment
cp .env.example .env.local   # add your Pexels API key
npm install
npx prisma migrate dev
npm run dev
```

### Part 1: Due Dates

- The create form includes a native date picker alongside the title input.
- Due dates are stored as nullable `DateTime` in the Prisma schema.
- Each todo card displays the due date as a pill badge. If the due date is in the past, the badge turns red (`bg-red-100 text-red-700`).

### Part 2: Image Previews

- When a todo is created, the `POST /api/todos` handler fetches the Pexels API server-side using the task title as the search query, then stores the returned image URL on the todo record.
- The API key never leaves the server (stored in `.env.local`, accessed via `process.env`).
- The form shows a spinner while the POST is in flight (which includes the Pexels round-trip). If Pexels returns no results or errors, the todo is still created -- it just gets a gradient placeholder instead of an image.
- Images are displayed using `next/image` with `remotePatterns` configured for `images.pexels.com`.

### Part 3: Task Dependencies

**Data model**: A `TodoDependency` join table with a unique constraint on `(dependentId, dependencyId)` and `onDelete: Cascade` so deleting a todo automatically cleans up its edges.

**Cycle prevention**: When adding a dependency edge A→B, the server runs a DFS from B through the existing graph. If it reaches A, the edge would create a cycle and the request is rejected with a 400 and a descriptive error message showing the exact cycle path. Self-references (`A→A`) are caught with an explicit check before the DFS.

**Critical Path Method (CPM)**: Implemented as a pure function in `lib/critical-path.ts`:
1. Kahn's algorithm for topological sort (also validates the graph is acyclic)
2. Forward pass: compute earliest start (ES) and earliest finish (EF) for each task
3. Backward pass: compute latest start (LS) and latest finish (LF)
4. Slack = LS − ES; tasks with zero slack are on the critical path

Due dates serve as finish constraints. Tasks without due dates default to a 1-day duration. Earliest start dates and critical path status are **computed on every GET request** (derived values, never stored), so they're always fresh.

**Dependency graph visualization**: Built with `@xyflow/react` (ReactFlow) and `@dagrejs/dagre` for automatic top-to-bottom layout. The graph auto-appears below the task list whenever dependencies exist. Features:
- Custom node components showing title, due date, and earliest start date
- Critical path nodes highlighted with amber borders and glow
- Critical path edges are animated and thicker
- Overdue nodes get red borders
- Legend explaining the color coding
- Built-in zoom, pan, and drag via ReactFlow
