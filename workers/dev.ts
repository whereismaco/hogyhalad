// Only supplies local bindings to Next.js; it never serves application requests.
const devBindingsWorker = {
  fetch() {
    return new Response("Use npm run dev for the application.", {
      status: 404,
    });
  },
};
export default devBindingsWorker;
