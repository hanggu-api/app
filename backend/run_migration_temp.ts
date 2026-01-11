import { run } from "./src/database/migrations/add_service_dispatches";

run()
  .then(() => {
    console.log("Migration executed");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
