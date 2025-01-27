const config = {
  API_ENDPOINTS: {
    main: "https://swaakon-backend-1035504557477.europe-north1.run.app",
    // main: "http://127.0.0.1:5000",
    checkCourseOverlap: "http://127.0.0.1:5000/check-internal-overlap",
    allOverlapResults: "http://127.0.0.1:5000/check-all-internal-courses",
  },

  ROUTES: {
    home: "/",
    about: "/about",
    courseData: "/course-data",
    others: "/others",
    checkAllInternalCourses: "/check-all-internal-courses",
    lastResults: "/last-results",
  },

  MISC: {
    appName: "SWAAKON",
  },
};

export default config;
