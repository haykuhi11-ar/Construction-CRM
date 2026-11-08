import { createBrowserRouter, Navigate } from "react-router-dom";

import ManagerLayout from "../layouts/ManagerLayout";

import Dashboard from "../pages/manager/Dashboard";
import Executors from "../pages/manager/Executors";
import Objects from "../pages/manager/Objects";
import Tasks from "../pages/manager/Tasks";
import Profile from "../pages/manager/Profile";
import Login from "../pages/Login";
import NotFound from "../pages/NoteFound";
import ExecutorLayout from "../layouts/ExecutorLayout";
import ExecutorDashboard from "../pages/executor/Dashboard";
import ExecutorTasks from "../pages/executor/Tasks";
import ExecutorObjects from "../pages/executor/Objects";
import ExecutorProfile from "../pages/executor/Profile";
import TaskDetails from "../pages/manager/TaskDetails";

export const routes = createBrowserRouter([
    {
        path: "/",
        element: <Navigate to="/manager/dashboard" replace />,
    },
    {
        path: "/",
        element: <Navigate to="/login" replace />,
    },
    {
        path: "/login",
        element: <Login />,
    },
    {
        path: "/manager",
        element: <ManagerLayout />,
        children: [
            {
                index: true,
                element: <Navigate to="dashboard" replace />,
            },
            {
                path: "dashboard",
                element: <Dashboard />,
            },
            {
                path: "executors",
                element: <Executors />,
            },
            {
                path: "objects",
                element: <Objects />,
            },
            {
                path: "tasks",
                element: <Tasks />,
            },
            {
                path: "tasks/:taskId",
                element: <TaskDetails />,
            },
            //   {
            //     path: "calendar",
            //     element: <Calendar />,
            //   },
            {
                path: "profile",
                element: <Profile />,
            },
            {
                path: "*",
                element: <NotFound />,
            },
            //   {
            //     path: "settings",
            //     element: <Settings />,
            //   },
        ],
    },
    {
  path: "/executor",
  element: <ExecutorLayout />,
  children: [
    {
      path: "dashboard", 
      element: <ExecutorDashboard />
    },
    {
      path: "tasks",
      element: <ExecutorTasks />,
    },
    {
      path: "objects",
      element: < ExecutorObjects/>,
    },
    {
      path: "calendar",
      element: <div>Calendar</div>,
    },
    {
      path: "profile",
      element: <ExecutorProfile />,
    },
    {
      path: "settings",
      element: <div>Settings</div>,
    },
  ],
},
]);
