export default {
  async fetch(request) {
    return Response.json({
      ok: true,
      name: "pg-stringbeat",
      path: new URL(request.url).pathname,
    });
  },
};
