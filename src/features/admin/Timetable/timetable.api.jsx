import { createAsyncThunk } from "@reduxjs/toolkit";
import makeApi from "../../../config/axiosConfig";

const api = makeApi();

export const generateTimetable = createAsyncThunk(
  "timetable/generate",
  async () => {
    const response = await api.post("/timetable/generate");
    return response.data;
  }
);

export const getTimetable = createAsyncThunk(
  "timetable/timetables",
  async () => {
    const response = await api.get("/timetable/timetables");
    return response.data;
  }
);

export const markAllNotificationsRead = createAsyncThunk(
  "notifications/markAllRead",
  async () => {
    const response = await api.put("/timetable/notifications/mark-all-read");
    return response.data;
  }
);

export const selectAlgorithm = createAsyncThunk(
  "timetable/select",
  async (algorithm) => {
    const result = await api.post("/timetable/select", { algorithm });
    return result.data;
  }
);

export const getSelectedAlgorithm = createAsyncThunk(
  "timetable/selected",
  async () => {
    const result = await api.get("/timetable/selected");
    console.log("Selected Algorithm:", result.data);
    return result.data;
  }
);

// New function to validate student information
export const validateStudentInfo = createAsyncThunk(
  "student/validateInfo",
  async () => {
    try {
      const response = await api.get("/timetable/student-info-validate");

      return response.data;
    } catch (error) {
      console.error("Error validating student information:", error);
      throw error;
    }
  }
);

// New function to validate faculty information
export const validateFacultyInfo = createAsyncThunk(
  "faculty/validateInfo",
  async () => {
    try {
      const response = await api.get(`/timetable/faculty-info-validate`);
      return response.data;
    } catch (error) {
      console.error("Error validating faculty information:", error);
      throw error;
    }
  }
);

// New functions for the published timetable

export const publishTimetable = createAsyncThunk(
  "timetable/publish",
  async (algorithm) => {
    try {
      const response = await api.post(
        `/timetable/publish?algorithm=${algorithm}`
      );
      return response.data;
    } catch (error) {
      console.error("Error publishing timetable:", error);
      throw error;
    }
  }
);

export const getPublishedTimetable = createAsyncThunk(
  "timetable/published",
  async () => {
    try {
      const response = await api.get("/timetable/published");
      return response.data;
    } catch (error) {
      console.error("Error fetching published timetable:", error);
      throw error;
    }
  }
);

export const getFacultyTimetable = createAsyncThunk(
  "timetable/facultyTimetable",
  async (facultyId) => {
    try {
      const response = await api.get(
        `/timetable/published/faculty/${facultyId}`
      );
      console.log("Response from faculty timetable:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        `Error fetching timetable for faculty ${facultyId}:`,
        error
      );
      throw error;
    }
  }
);

export const getStudentTimetable = createAsyncThunk(
  "timetable/studentTimetable",
  async (semester) => {
    try {
      const response = await api.get(
        `/timetable/published/student/${semester}`
      );
      return response.data;
    } catch (error) {
      console.error(
        `Error fetching timetable for semester ${semester}:`,
        error
      );
      throw error;
    }
  }
);

// New function to get timetable for a specific year_group
export const getStudentYearGroupTimetable = createAsyncThunk(
  "timetable/studentYearGroupTimetable",
  async ({ yearGroup, specialization }) => {
    try {
      // Build the URL with query parameters
      let url = `/timetable/published/student-year-group/${yearGroup}`;
      if (specialization) {
        url += `?specialization=${encodeURIComponent(specialization)}`;
      }

      const response = await api.get(url);
      console.log("Response from student year group timetable:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        `Error fetching timetable for year group ${yearGroup}:`,
        error
      );
      throw error;
    }
  }
);

// Function to handle student timetable fetching with proper fallbacks
export const getStudentTimetableData = createAsyncThunk(
  "timetable/getStudentTimetableData",
  async (_, { getState, dispatch }) => {
    try {
      // First try to get student validation data to see if we have year_group
      const validationResult = await dispatch(validateStudentInfo()).unwrap();

      if (validationResult.valid && validationResult.student_info) {
        const studentInfo = validationResult.student_info;

        // If we have year_group, use that endpoint
        if (studentInfo.year_group) {
          console.log(
            "Using year_group to fetch student timetable:",
            studentInfo.year_group
          );

          // Extract specialization from year_group if it's not set explicitly
          let specialization = studentInfo.specialization;
          if (!specialization && studentInfo.year_group.includes(".")) {
            const parts = studentInfo.year_group.split(".");
            if (parts.length >= 2) {
              specialization = parts[1]; // Extract specialization like "SE" from "Y1S1.SE.1"
              console.log(
                `Extracted specialization from year_group: ${specialization}`
              );
            }
          }

          // Log the class number for debugging
          let classNumber = null;
          if (studentInfo.year_group.includes(".")) {
            const parts = studentInfo.year_group.split(".");
            if (parts.length >= 3) {
              classNumber = parts[2]; // Extract class number like "1" from "Y1S1.SE.1"
              console.log(`Using class number: ${classNumber}`);
            }
          }

          const yearGroupResult = await dispatch(
            getStudentYearGroupTimetable({
              yearGroup: studentInfo.year_group,
              specialization: specialization,
            })
          ).unwrap();

          // Add the class number to the response for frontend filtering
          return {
            ...yearGroupResult,
            classNumber: classNumber,
          };
        }

        // Otherwise, fall back to subgroup if available
        if (studentInfo.subgroup) {
          console.log(
            "Using subgroup to fetch student timetable:",
            studentInfo.subgroup
          );
          const subgroupResult = await dispatch(
            getStudentTimetable(studentInfo.subgroup)
          ).unwrap();
          return subgroupResult;
        }
      }

      // If no student info or unsuccessful validation, return empty data
      return {
        entries: [],
        message: "Could not determine student details to fetch timetable",
      };
    } catch (error) {
      console.error("Error fetching student timetable:", error);
      return {
        entries: [],
        message: `Error fetching timetable: ${error.message}`,
      };
    }
  }
);

// Function to handle faculty timetable fetching with validation
export const getFacultyTimetableData = createAsyncThunk(
  "timetable/getFacultyTimetableData",
  async (_, { getState, dispatch }) => {
    try {
      const validationResult = await dispatch(validateFacultyInfo()).unwrap();
      if (validationResult.valid && validationResult.faculty_info) {
        const facultyInfo = validationResult.faculty_info;
        console.log("Using faculty info to fetch timetable:", facultyInfo);
        const facultyId = facultyInfo.id;
        const timetableResult = await dispatch(
          getFacultyTimetable(facultyId)
        ).unwrap();
        return {
          ...timetableResult,
          faculty_info: facultyInfo,
        };
      }

      if (!facultyId) {
        return {
          entries: [],
          message: "User ID not available. Please log in again.",
        };
      }

      return {
        entries: [],
        message:
          validationResult.message || "Could not validate faculty information",
        faculty_info: validationResult.faculty_info,
      };
    } catch (error) {
      console.error("Error fetching faculty timetable data:", error);
      return {
        entries: [],
        message: `Error fetching timetable: ${error.message}`,
      };
    }
  }
);

// New functions for updating timetable entries and handling substitutes

export const updateTimetableEntry = createAsyncThunk(
  "timetable/updateEntry",
  async ({ semester, entryIndex, fields }) => {
    try {
      // Prepare params for the API call - entryIndex and semester are required
      const params = {
        semester,
        entry_index: entryIndex,
        ...fields,
      };

      const response = await api.put("/timetable/published/entry", null, {
        params,
      });
      return response.data;
    } catch (error) {
      console.error("Error updating timetable entry:", error);
      throw error;
    }
  }
);

export const assignSubstitute = createAsyncThunk(
  "timetable/assignSubstitute",
  async ({ semester, entryIndex, substitute, reason }) => {
    try {
      const params = {
        semester,
        entry_index: entryIndex,
        substitute,
        reason,
      };

      const response = await api.put("/timetable/published/substitute", null, {
        params,
      });
      return response.data;
    } catch (error) {
      console.error("Error assigning substitute teacher:", error);
      throw error;
    }
  }
);

export const removeSubstitute = createAsyncThunk(
  "timetable/removeSubstitute",
  async ({ semester, entryIndex }) => {
    try {
      const params = {
        semester,
        entry_index: entryIndex,
      };

      const response = await api.put(
        "/timetable/published/remove-substitute",
        null,
        { params }
      );
      return response.data;
    } catch (error) {
      console.error("Error removing substitute teacher:", error);
      throw error;
    }
  }
);

export const llmResponse = async (scores) => {
  try {
    // Use the new backend endpoint for algorithm evaluation
    const response = await api.post("/timetable/evaluate-algorithms", {
      scores: scores,
    });

    // The backend will return the analysis from DeepSeek
    return response.data.analysis;
  } catch (error) {
    console.error("Error evaluating algorithms:", error);
    return "Failed to evaluate algorithms. Please try again later.";
  }
};

export const formatScoresForAPI = (evaluation) => {
  // This function is retained for compatibility, but main formatting is now done on the backend
  const formattedScores = {};

  // Loop through all algorithms in the evaluation object
  for (const algorithm in evaluation) {
    formattedScores[algorithm] = {};
    // Get the metrics for this algorithm
    const metrics = evaluation[algorithm];

    // Format each metric value
    for (const metric in metrics) {
      formattedScores[algorithm][metric] = metrics[metric];
    }
  }

  return formattedScores;
};

export const getNotifications = createAsyncThunk(
  "timetable/notifications",
  async () => {
    const response = await api.get("/timetable/notifications");
    return response.data;
  }
);

export const setNotificationRead = createAsyncThunk(
  "timetable/read",
  async (id) => {
    const response = await api.put(`/timetable/notifications/${id}`);
    return response.data;
  }
);

export const editTimetable = createAsyncThunk(
  "timetable/edit",
  async ({ timetableId, timetableData, sessionId }, { rejectWithValue }) => {
    try {
      const response = await api.patch(
        `/timetable/timetable/${timetableId}/activity/${sessionId}`,
        timetableData
      );
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        return rejectWithValue(error.response.data);
      }
      throw error;
    }
  }
);

export const getAvailableSpaces = createAsyncThunk(
  "timetable/availableSpaces",
  async ({ algorithm, day, periods, excludeSessionId }) => {
    try {
      // Convert periods to a string if it's an array
      const periodsParam = Array.isArray(periods) ? periods.join(",") : periods;

      // Extract day name if day is an object
      const dayParam = typeof day === "object" && day !== null ? day.name : day;

      // Build the base URL with required query parameters
      let url = `/timetable/available-spaces?algorithm=${encodeURIComponent(
        algorithm
      )}&day=${encodeURIComponent(dayParam)}&periods=${encodeURIComponent(
        periodsParam
      )}`;

      // Add the excludeSessionId parameter if it exists and is not null/undefined
      if (excludeSessionId) {
        url += `&exclude_session_id=${encodeURIComponent(excludeSessionId)}`;
      }

      console.log("Fetching available spaces with URL:", url);
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error("Error fetching available spaces:", error);
      throw error;
    }
  }
);

export const getAlgorithmTimetables = createAsyncThunk(
  "timetable/algorithmTimetables",
  async (algorithm, dayName) => {
    try {
      const response = await api.get(
        `/timetable/algorithm-timetables/${algorithm}`
      );
      return response.data;
    } catch (error) {
      console.error(
        `Error fetching timetables for algorithm ${algorithm}:`,
        error
      );
      throw error;
    }
  }
);

// Faculty timetable change requests
export const submitTimetableChangeRequest = createAsyncThunk(
  "timetable/submitChangeRequest",
  async (requestData) => {
    try {
      const response = await api.post(
        "/timetable/faculty/request-change",
        requestData
      );
      return response.data;
    } catch (error) {
      console.error("Error submitting change request:", error);
      throw error;
    }
  }
);

export const getFacultyChangeRequests = createAsyncThunk(
  "timetable/getFacultyChangeRequests",
  async () => {
    try {
      const response = await api.get("/timetable/faculty/change-requests");
      return response.data;
    } catch (error) {
      console.error("Error fetching faculty change requests:", error);
      throw error;
    }
  }
);

// Admin management of change requests
export const getAdminChangeRequests = createAsyncThunk(
  "timetable/getAdminChangeRequests",
  async (status) => {
    try {
      let url = "/timetable/admin/change-requests";
      if (status) {
        url += `?status=${status}`;
      }
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error("Error fetching admin change requests:", error);
      throw error;
    }
  }
);

export const updateChangeRequestStatus = createAsyncThunk(
  "timetable/updateChangeRequestStatus",
  async ({ requestId, statusData }, { rejectWithValue, dispatch }) => {
    try {
      // Convert status values to match API requirements
      const apiStatusData = {
        ...statusData,
        status:
          statusData.status === "approve"
            ? "approved"
            : statusData.status === "reject"
            ? "rejected"
            : statusData.status,
      };

      // First update the request status
      const response = await api.put(
        `/timetable/admin/change-requests/${requestId}`,
        apiStatusData
      );

      // If it's an approval, we need to update the timetable entry
      if (apiStatusData.status === "approved" && response.data.request) {
        const request = response.data.request;

        console.log("Request data for timetable update:", request);

        // Prepare timetable data based on the request type
        let timetableData = {};

        switch (request.type) {
          case "substitute":
            timetableData = {
              teacher: request.substitute_id,
              is_substitute: true,
              substitute_reason: request.reason || "Faculty request",
            };
            break;

          case "roomChange":
            timetableData = {
              room: request.new_room,
            };
            break;

          case "timeChange":
            timetableData = {
              day: request.new_day,
              period: request.new_periods,
            };

            // If a new room is also specified for time change
            if (request.new_room) {
              timetableData.room = request.new_room;
            }
            break;

          default:
            break;
        }

        // // Only proceed with timetable update if we have data to update
        // if (Object.keys(timetableData).length > 0) {
        //   try {
        //     // Call the editTimetable function with the prepared data
        //     await dispatch(
        //       editTimetable({
        //         timetableId: request.timetable_id,
        //         timetableData: timetableData,
        //         sessionId: request.session_id,
        //       })
        //     ).unwrap();

        //     // Update the response to indicate that timetable was also updated
        //     response.data.timetableUpdated = true;
        //   } catch (editError) {
        //     // If there are conflicts, attach them to the response
        //     if (editError.conflicts) {
        //       response.data.conflicts = editError.conflicts;
        //     }

        //     // Return the error as part of the response without failing the entire operation
        //     response.data.timetableUpdateError =
        //       editError.message || "Failed to update timetable";
        //     response.data.timetableUpdated = false;
        //   }
        // }
      }

      return response.data;
    } catch (error) {
      console.error("Error updating change request status:", error);
      if (error.response && error.response.data) {
        return rejectWithValue(error.response.data);
      }
      throw error;
    }
  }
);
