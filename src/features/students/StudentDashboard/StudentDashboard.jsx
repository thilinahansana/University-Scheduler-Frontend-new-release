import React, { useEffect, useState } from "react";
import {
  Card,
  Tabs,
  Table,
  Popover,
  Spin,
  Typography,
  ConfigProvider,
  Empty,
  message,
  Tag,
  Row,
  Col,
  Badge,
  Alert,
  Avatar,
} from "antd";
import { useSelector, useDispatch } from "react-redux";
import {
  validateStudentInfo,
  getStudentTimetableData,
} from "../../admin/Timetable/timetable.api";
import {
  getDays,
  getPeriods,
  getSubjects,
  getSpaces,
  getTeachers,
} from "../../admin/DataManagement/data.api";
import {
  CalendarOutlined,
  BookOutlined,
  TeamOutlined,
  HomeOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  TagOutlined,
  UserOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

function StudentDashboard() {
  const dispatch = useDispatch();
  // Provide default value for studentTimetable to prevent null errors
  const { studentTimetable = { entries: [] }, loading } = useSelector(
    (state) => state.timetable
  );
  const { days, periods, subjects, teachers, spaces } = useSelector(
    (state) => state.data
  );
  const [userSemester, setUserSemester] = useState("");
  const [userYearGroup, setUserYearGroup] = useState("");
  const [userSubjects, setUserSubjects] = useState([]);
  const [userSpecialization, setUserSpecialization] = useState("");
  const [userInfo, setUserInfo] = useState(null);
  const [validationStatus, setValidationStatus] = useState({
    loading: true,
    valid: false,
    message: "",
    studentInfo: null,
  });

  // Define the standard order of days (Monday to Friday)
  const dayOrder = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 7,
  };

  // Sort days by standard weekday order
  const sortDays = (days) => {
    if (!days || !Array.isArray(days)) return [];
    return [...days].sort((a, b) => {
      // Try to match exact name or part of the name for case insensitivity
      const dayA = a.name?.toLowerCase() || "";
      const dayB = b.name?.toLowerCase() || "";

      // Check for day names in different formats (could be "mon", "monday", etc.)
      let orderA = 100; // Default high value if not found
      let orderB = 100;

      // Try to match common day prefixes
      Object.keys(dayOrder).forEach((day) => {
        if (dayA.includes(day.substring(0, 3))) orderA = dayOrder[day];
        if (dayB.includes(day.substring(0, 3))) orderB = dayOrder[day];
      });

      return orderA - orderB;
    });
  };

  // Sort periods numerically or alphabetically
  const sortPeriods = (periods) => {
    if (!periods || !Array.isArray(periods)) return [];
    return [...periods].sort((a, b) => {
      // If periods have numeric names like "1", "2", etc.
      const numA = parseInt(a.name);
      const numB = parseInt(b.name);

      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      // If periods have order property
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      // If periods have index property
      if (a.index !== undefined && b.index !== undefined) {
        return a.index - b.index;
      }
      // Default to alphabetical sort
      return a.name.localeCompare(b.name);
    });
  };

  // Extract specialization from year_group
  const extractSpecialization = (yearGroup) => {
    if (!yearGroup || typeof yearGroup !== "string") return null;

    // Handle format like "Y1S1.5" where 5 is the class number and SE is implied
    if (/^Y\d+S\d+\.\d+$/.test(yearGroup)) {
      const parts = yearGroup.split(".");
      return "SE"; // Default to SE for this format
    }
    // Handle standard format like "Y1S1.SE.5"
    const parts = yearGroup.split(".");
    if (parts.length >= 2) {
      return parts[1]; // E.g., "SE" from "Y1S1.SE.1"
    }
    return null;
  };

  // Extract base year group without specific class number
  const getBaseYearGroup = (yearGroup) => {
    if (!yearGroup || typeof yearGroup !== "string") return null;

    // Handle format like "Y1S1.5" where 5 is the class number
    if (/^Y\d+S\d+\.\d+$/.test(yearGroup)) {
      const parts = yearGroup.split(".");
      return parts[0]; // Return "Y1S1"
    }
    // Handle standard format
    const parts = yearGroup.split(".");
    if (parts.length >= 2) {
      return `${parts[0]}.${parts[1]}`; // E.g., "Y1S1.SE" from "Y1S1.SE.1"
    }
    return yearGroup;
  };

  // Extract class number from year_group
  const extractClassNumber = (yearGroup) => {
    if (!yearGroup || typeof yearGroup !== "string") return null;

    // Handle format like "Y1S1.5" where 5 is the class number
    if (/^Y\d+S\d+\.\d+$/.test(yearGroup)) {
      const parts = yearGroup.split(".");
      return parts[1]; // Return "5" from "Y1S1.5"
    }
    // Handle standard format like "Y1S1.SE.5"
    const parts = yearGroup.split(".");
    if (parts.length >= 3) {
      return parts[2]; // Return "5" from "Y1S1.SE.5"
    }
    return null;
  };

  // Extract semester part (like "Y1S1") from year_group
  const extractSemesterPart = (yearGroup) => {
    if (!yearGroup || typeof yearGroup !== "string") return null;
    // For both formats, get the semester part (Y1S1)
    const match = yearGroup.match(/^(Y\d+S\d+)/);
    if (match && match[1]) {
      return match[1];
    }
    return null;
  };

  useEffect(() => {
    console.log("StudentDashboard useEffect - Beginning data fetch");
    dispatch(getSubjects());
    dispatch(getTeachers());

    // Create a local state variable to hold the timetable data in case Redux isn't saving it properly
    let fetchedTimetableData = null;

    // Use our comprehensive timetable fetching function
    dispatch(getStudentTimetableData())
      .unwrap()
      .then((result) => {
        console.log("Student timetable fetched:", result);

        // Store the result in our local variable
        fetchedTimetableData = result;

        if (Array.isArray(result.entries) && result.entries.length > 0) {
          console.log("Sample entry:", result.entries[0]);

          // Store a copy of the entries in localStorage as a backup
          try {
            localStorage.setItem(
              "studentTimetableEntries",
              JSON.stringify(result)
            );
            console.log("Timetable data cached in localStorage");
          } catch (err) {
            console.warn("Could not cache timetable in localStorage:", err);
          }
        } else {
          console.log("No entries in timetable or entries is not an array");
          result.entries = result.entries || [];
        }

        // If we received year_group from the API, update our state
        if (result.year_group) {
          setUserYearGroup(result.year_group);

          // Extract specialization from year_group if not provided
          if (!result.specialization) {
            const extracted = extractSpecialization(result.year_group);
            if (extracted) {
              setUserSpecialization(extracted);
              console.log(
                `Extracted specialization from year_group: ${extracted}`
              );
            }
          }
        }

        // If we received specialization directly, update state
        if (result.specialization) {
          setUserSpecialization(result.specialization);
          console.log(
            `Setting specialization from result: ${result.specialization}`
          );
        }
        // If we received semester from the API, update our state
        if (result.semester) {
          setUserSemester(result.semester);
        }
      })
      .catch((error) => {
        console.error("Error fetching student timetable:", error);
        message.error("Failed to load your timetable. Please try again later.");

        // Try to load from localStorage if API call fails
        try {
          const cachedData = localStorage.getItem("studentTimetableEntries");
          if (cachedData) {
            fetchedTimetableData = JSON.parse(cachedData);
            console.log("Loaded timetable from cache:", fetchedTimetableData);
          }
        } catch (err) {
          console.warn("Could not load cached timetable:", err);
        }
      });

    // Also validate student info to get subject list and other details
    const validateStudent = async () => {
      setValidationStatus((prev) => ({ ...prev, loading: true }));
      try {
        const result = await dispatch(validateStudentInfo()).unwrap();

        console.log("Student validation result:", result);

        setValidationStatus({
          loading: false,
          valid: result.valid,
          message: result.message,
          studentInfo: result.student_info,
        });

        if (result.valid && result.student_info) {
          const studentInfo = result.student_info;
          // Store complete student info
          setUserInfo(studentInfo);

          // Update state with the student info returned from server
          setUserSemester(studentInfo.subgroup || "");
          setUserYearGroup(studentInfo.year_group || "");
          setUserSubjects(studentInfo.subjects || []);

          // Set specialization from response or extract it
          if (studentInfo.specialization) {
            setUserSpecialization(studentInfo.specialization);
          } else if (studentInfo.year_group) {
            const extracted = extractSpecialization(studentInfo.year_group);
            if (extracted) {
              setUserSpecialization(extracted);
            }
          }
        } else {
          message.warning(result.message || "Student profile is incomplete");
        }
      } catch (error) {
        console.error("Error validating student:", error);
        setValidationStatus({
          loading: false,
          valid: false,
          message: error.message || "Failed to validate student information",
          studentInfo: null,
        });
        message.error("Failed to load student information");
      }
    };

    validateStudent();
  }, [dispatch]);

  // Check if an activity matches the current student
  const activityMatchesStudent = (activity) => {
    if (!activity) return false;

    // First check: if the subject doesn't match, don't even proceed further
    if (userSubjects && userSubjects.length > 0) {
      if (!userSubjects.includes(activity.subject)) {
        return false;
      }
    }

    // Extract the class number from user's year_group (e.g., "5" from "Y1S1.IT.5")
    const userClass = extractClassNumber(userYearGroup);

    // Extract semester part (e.g., "Y1S1" from "Y1S1.IT.5")
    const semesterPart = extractSemesterPart(userYearGroup);

    // For debugging
    console.log(`Checking activity for ${activity.subject}:`, {
      userYearGroup,
      userClass,
      semesterPart,
      userSpecialization,
      subgroup: activity.subgroup,
    });

    // For array of subgroups (multiple classes)
    if (Array.isArray(activity.subgroup)) {
      // 1. Direct match with user's exact year_group - highest priority
      if (activity.subgroup.includes(userYearGroup)) {
        console.log(`Match: Direct match with ${userYearGroup}`);
        return true;
      }

      // 2. For common semester activities (applies to all students in the semester)
      if (semesterPart && activity.subgroup.includes(semesterPart)) {
        console.log(`Match: Common semester activity for ${semesterPart}`);
        return true;
      }

      // 3. For activities that apply to all students of the specialization
      if (userSpecialization && semesterPart) {
        const specializationFormat = `${semesterPart}.${userSpecialization}`;
        if (activity.subgroup.includes(specializationFormat)) {
          console.log(
            `Match: Common activity for specialization ${specializationFormat}`
          );
          return true;
        }
      }

      // 4. Explicitly reject activities for other class numbers in the same specialization
      if (userClass && userSpecialization) {
        for (const sg of activity.subgroup) {
          if (!sg) continue;

          const parts = sg.split(".");
          // If this is for a specific class in our specialization but NOT our class number
          if (
            parts.length >= 3 &&
            parts[0] === semesterPart &&
            parts[1] === userSpecialization &&
            parts[2] !== userClass
          ) {
            console.log(`Reject: Activity for different class number: ${sg}`);
            return false;
          }
        }
      }

      // 5. Special case for lecture/tutorial activities
      if (
        activity.activity_type?.includes("Lecture") ||
        activity.activity_type?.includes("Tutorial") ||
        activity.activity_type?.includes("Lecture+Tutorial")
      ) {
        // For lectures, check if any subgroup matches our specialization
        if (userSpecialization) {
          for (const sg of activity.subgroup) {
            if (!sg) continue;

            // Check for specialization match without specific class number
            if (sg === `${semesterPart}.${userSpecialization}`) {
              console.log(
                `Match: Lecture/Tutorial for specialization ${userSpecialization}`
              );
              return true;
            }

            // Or exact match with our class
            if (
              userClass &&
              sg === `${semesterPart}.${userSpecialization}.${userClass}`
            ) {
              console.log(`Match: Lecture/Tutorial for exact class ${sg}`);
              return true;
            }
          }
        }
      }
    }
    // For single subgroup string
    else if (typeof activity.subgroup === "string") {
      const subgroup = activity.subgroup;

      // 1. Direct match with exact year_group - highest priority
      if (subgroup === userYearGroup) {
        console.log(
          `Match: Direct match with single subgroup ${userYearGroup}`
        );
        return true;
      }

      // 2. Match with just semester (for activities common to all specializations)
      if (semesterPart && subgroup === semesterPart) {
        console.log(`Match: Common semester activity ${semesterPart}`);
        return true;
      }

      // 3. Match with semester + specialization (for activities common to all classes of a specialization)
      if (userSpecialization && semesterPart) {
        const specFormat = `${semesterPart}.${userSpecialization}`;

        if (subgroup === specFormat) {
          console.log(`Match: Specialization format ${specFormat} matched`);
          return true;
        }

        // 4. Reject activities for other specific classes within our specialization
        if (userClass && subgroup.startsWith(`${specFormat}.`)) {
          const parts = subgroup.split(".");
          if (parts.length >= 3 && parts[2] !== userClass) {
            console.log(
              `Reject: Activity for different class number: ${subgroup}`
            );
            return false;
          }

          // Must be an exact match to our class number
          return subgroup === userYearGroup;
        }
      }
    }

    return false;
  };

  // Helper function to get the current timetable data, with fallbacks
  const getCurrentTimetableData = () => {
    // Option 1: Use Redux state if available
    if (studentTimetable && studentTimetable.entries) {
      return studentTimetable;
    }

    // Option 2: Try to load from localStorage
    try {
      const cachedData = localStorage.getItem("studentTimetableEntries");
      if (cachedData) {
        return JSON.parse(cachedData);
      }
    } catch (err) {
      console.warn("Could not load cached timetable:", err);
    }

    // Option 3: Default empty timetable
    return { entries: [] };
  };

  // Extract days and periods from timetable entries
  const extractDaysAndPeriods = (entries) => {
    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return { days: [], periods: [] };
    }

    // Extract unique days from entries
    const uniqueDays = [];
    const daysMap = new Map();

    // Extract unique periods from entries
    const uniquePeriods = [];
    const periodsMap = new Map();

    entries.forEach((entry) => {
      // Handle day data
      if (entry.day && entry.day.name) {
        if (!daysMap.has(entry.day.name)) {
          daysMap.set(entry.day.name, true);
          uniqueDays.push(entry.day);
        }
      }

      // Handle period data - could be an array of periods
      if (Array.isArray(entry.period)) {
        entry.period.forEach((period) => {
          if (period && period.name) {
            if (!periodsMap.has(period.name)) {
              periodsMap.set(period.name, true);
              uniquePeriods.push(period);
            }
          }
        });
      }
    });

    console.log(
      `Extracted ${uniqueDays.length} days and ${uniquePeriods.length} periods from timetable entries`
    );

    return {
      days: uniqueDays,
      periods: uniquePeriods,
    };
  };

  // Helper function to generate dataSource for the table
  const generateDataSource = (semesterTimetable) => {
    if (!semesterTimetable || !Array.isArray(semesterTimetable)) {
      return [];
    }

    console.log(
      `Generating timetable with ${semesterTimetable.length} entries`
    );

    // Extract days and periods from the entries
    const { days: extractedDays, periods: extractedPeriods } =
      extractDaysAndPeriods(semesterTimetable);

    if (extractedDays.length === 0 || extractedPeriods.length === 0) {
      console.error("Could not extract days or periods from timetable data");
      return [];
    }

    // Filter entries that match this student for debugging
    const matchingEntries = semesterTimetable.filter(activityMatchesStudent);
    console.log(
      `Found ${matchingEntries.length} entries matching student criteria out of ${semesterTimetable.length} total entries`
    );

    // Log a few examples of what matched and what didn't
    if (process.env.NODE_ENV !== "production") {
      // Show a sample of matching entries
      if (matchingEntries.length > 0) {
        console.log(
          "Examples of matched entries:",
          matchingEntries.slice(0, 3).map((e) => ({
            subject: e.subject,
            subgroup: e.subgroup,
            activity_type: e.activity_type,
          }))
        );
      }

      // Show some examples of rejected entries
      const rejectedEntries = semesterTimetable.filter(
        (e) => !activityMatchesStudent(e)
      );
      if (rejectedEntries.length > 0) {
        console.log(
          "Examples of rejected entries:",
          rejectedEntries.slice(0, 3).map((e) => ({
            subject: e.subject,
            subgroup: e.subgroup,
            activity_type: e.activity_type,
          }))
        );
      }
    }

    // Sort the days and periods
    const sortedPeriods = sortPeriods(extractedPeriods);
    const sortedDays = sortDays(extractedDays);

    // Generate table data using ONLY the matching entries
    const dataSource = sortedPeriods.map((period, periodIndex) => {
      const rowData = {
        key: periodIndex,
        period: period.long_name || period.name,
      };

      sortedDays.forEach((day) => {
        // Use only matching entries when finding activities for each cell
        const activity = findMatchingActivity(matchingEntries, day, period);
        rowData[day.name] = activity ? prepareCellData(activity) : null;
      });

      return rowData;
    });

    console.log("Generated dataSource rows:", dataSource.length);
    return dataSource;
  };

  // Helper function to generate columns for the table
  const generateColumns = (timetableEntries) => {
    // Extract days from the entries
    const { days: extractedDays } = extractDaysAndPeriods(timetableEntries);

    // Sort days using the custom sort function to ensure Monday to Friday order
    const sortedDays = sortDays(extractedDays);

    return [
      {
        title: "Period",
        dataIndex: "period",
        key: "period",
        width: 150,
        fixed: "left",
        className: "period-column",
        render: (text) => (
          <div className="period-cell">
            <ClockCircleOutlined style={{ marginRight: 8 }} />
            <span className="font-medium text-gray-700">{text}</span>
          </div>
        ),
      },
      ...sortedDays
        .filter((day) => {
          // Keep only weekdays or days that have short names
          const dayName = day.name?.toLowerCase() || "";
          return ["mon", "tue", "wed", "thu", "fri"].some((d) =>
            dayName.includes(d)
          );
        })
        .map((day) => ({
          title: day.long_name || day.name,
          dataIndex: day.name,
          key: day.name,
          className: "day-column",
          render: (cell) => {
            if (!cell) {
              return <div className="empty-cell">-</div>;
            }

            const {
              title,
              subjectName,
              room,
              teacher,
              duration,
              activity_type,
              subgroup,
            } = cell;

            const popoverContent = (
              <div>
                <p>
                  <BookOutlined /> <strong>Subject:</strong> {subjectName}
                </p>
                <p>
                  <HomeOutlined /> <strong>Room:</strong> {room}
                </p>
                <p>
                  <TeamOutlined /> <strong>Teacher:</strong> {teacher}
                </p>
                {duration && (
                  <p>
                    <ClockCircleOutlined /> <strong>Duration:</strong>{" "}
                    {duration} hours
                  </p>
                )}
                <p>
                  <TagOutlined /> <strong>Type:</strong> {activity_type}
                </p>
                {subgroup && (
                  <p>
                    <TagOutlined /> <strong>Group:</strong> {subgroup}
                  </p>
                )}
              </div>
            );

            return (
              <Popover
                content={popoverContent}
                title={
                  <span>
                    <CalendarOutlined /> Class Details
                  </span>
                }
                placement="right"
              >
                <div className="class-cell">
                  <Tag color="blue" className="subject-tag">
                    {subjectName}
                  </Tag>
                  <div className="room-text">Room: {room}</div>
                  <div className="type-text">
                    <Tag color="green" size="small">
                      {activity_type}
                    </Tag>
                  </div>
                </div>
              </Popover>
            );
          },
        })),
    ];
  };

  // Extract cell data preparation to reduce nesting depth
  const prepareCellData = (activity) => {
    if (!activity) {
      return null;
    }

    // Find the teacher name from the teachers array
    const teacherDetails = teachers?.find((t) => t.id === activity.teacher);
    const teacherName = teacherDetails
      ? `${teacherDetails.first_name} ${teacherDetails.last_name}`
      : activity.teacher;

    // Find the subject details from the subjects array
    const subjectDetails = subjects?.find((s) => s.code === activity.subject);
    const subjectName = subjectDetails?.code || activity.subject;

    // Find the room details from the spaces array
    const roomName =
      typeof activity.room === "object"
        ? activity.room?.long_name || activity.room?.name
        : activity.room;

    // Format subgroup display - handle arrays
    let subgroupDisplay = Array.isArray(activity.subgroup)
      ? activity.subgroup.join(", ")
      : activity.subgroup || "";

    return {
      title: `${subjectName} (${roomName})`,
      subject: activity.subject,
      subjectName: subjectName,
      room: roomName,
      teacher: teacherName,
      duration: activity.duration,
      activity: activity,
      subgroup: subgroupDisplay,
      activity_type: activity.activity_type || "Class",
    };
  };

  // Find matching activities for a specific day and period
  const findMatchingActivity = (timetableEntries, day, period) => {
    if (!timetableEntries || !Array.isArray(timetableEntries)) {
      return null;
    }

    // Filter for activities that match this student's criteria
    const matchingActivities = timetableEntries.filter((entry) => {
      // Step 1: Check if this activity is for this student
      if (!activityMatchesStudent(entry)) {
        return false;
      }

      // Step 2: Check if on the correct day
      if (!entry.day || entry.day.name !== day.name) {
        return false;
      }

      // Step 3: Check if the period matches
      if (!Array.isArray(entry.period)) {
        return false;
      }

      // Check if any of the activity's periods match the current period
      return entry.period.some(
        (p) => p.name === period.name || p.long_name === period.long_name
      );
    });

    // Return the first matching activity
    return matchingActivities.length > 0 ? matchingActivities[0] : null;
  };

  // Get the current timetable data before using it
  const currentTimetableData = getCurrentTimetableData();

  // Render the Timetable tab using only the timetable data
  const renderTimetableTab = () => {
    if (
      !currentTimetableData ||
      !currentTimetableData.entries ||
      currentTimetableData.entries.length === 0
    ) {
      return <Empty description="No classes assigned for your semester" />;
    }

    const { days: extractedDays, periods: extractedPeriods } =
      extractDaysAndPeriods(currentTimetableData.entries);

    if (extractedDays.length === 0 || extractedPeriods.length === 0) {
      return (
        <Alert
          message="Incomplete Data"
          description="Could not extract timetable structure from the available data."
          type="warning"
          showIcon
        />
      );
    }

    return (
      <>
        <Table
          columns={generateColumns(currentTimetableData.entries)}
          dataSource={generateDataSource(currentTimetableData.entries)}
          pagination={false}
          bordered
          size="middle"
          className="timetable-table"
          loading={loading}
          locale={{
            emptyText: "No matching classes found for your schedule",
          }}
        />
      </>
    );
  };

  return (
    <div className="student-dashboard-container">
      <Title level={2} className="dashboard-title">
        Student Dashboard
      </Title>

      {/* Show validation status if there's an issue */}
      {!validationStatus.loading && !validationStatus.valid && (
        <Alert
          message="Profile Incomplete"
          description={
            <>
              <p>
                {validationStatus.message ||
                  "Your student profile is incomplete. Some features may not work correctly."}
              </p>
              <p>
                Please contact your administrator to update your profile
                information.
              </p>
            </>
          }
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined />}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Student Profile Summary Card */}
      {userInfo && (
        <Card
          className="profile-summary-card"
          title={
            <div style={{ display: "flex", alignItems: "center" }}>
              <Avatar
                size="large"
                icon={<UserOutlined />}
                style={{ marginRight: 12, backgroundColor: "#1677ff" }}
              />
              <span>Student Profile</span>
            </div>
          }
          style={{ marginBottom: 16 }}
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <p>
                <strong>Name:</strong> {userInfo.first_name}{" "}
                {userInfo.last_name}
              </p>
              <p>
                <strong>ID:</strong> {userInfo.id}
              </p>
              <p>
                <strong>Year:</strong> {userInfo.year}
              </p>
              <p>
                <strong>Specialization:</strong>{" "}
                <Tag color="blue">{userInfo.specialization}</Tag>
              </p>
            </Col>
            <Col xs={24} md={12}>
              <p>
                <strong>Year Group:</strong> {userInfo.year_group}
              </p>
              <p>
                <strong>Subgroup:</strong> {userInfo.subgroup}
              </p>
              <p>
                <strong>Email:</strong> {userInfo.email}
              </p>
              <p>
                <strong>Position:</strong> {userInfo.position}
              </p>
            </Col>
          </Row>
        </Card>
      )}

      {/* My Timetable Section */}
      <Card
        title={
          <div className="timetable-card-title">
            <CalendarOutlined style={{ marginRight: 8 }} />
            My Class Schedule
            <div className="timetable-badges">
              {userYearGroup && (
                <Badge
                  count={userYearGroup}
                  style={{ backgroundColor: "#52c41a", marginLeft: 10 }}
                />
              )}
              {userSpecialization && (
                <Badge
                  count={userSpecialization}
                  style={{ backgroundColor: "#1677ff", marginLeft: 10 }}
                />
              )}
            </div>
          </div>
        }
        className="timetable-card"
      >
        {loading || validationStatus.loading ? (
          <div className="loading-container">
            <Spin size="large" tip="Loading your timetable..." />
          </div>
        ) : !currentTimetableData ||
          !currentTimetableData.entries ||
          currentTimetableData.entries.length === 0 ? (
          <Empty
            description={
              validationStatus.valid
                ? "No published timetable available yet"
                : "Cannot load timetable - profile is incomplete"
            }
          />
        ) : (
          <ConfigProvider
            theme={{
              components: {
                Tabs: {
                  cardBg: "#f0f2f5",
                  itemSelectedColor: "#1677ff",
                  itemHoverColor: "#1677ff",
                  inkBarColor: "#1677ff",
                },
                Table: {
                  headerBg: "#f5f5f5",
                  headerColor: "rgba(0,0,0,0.85)",
                  headerSplitColor: "#f0f0f0",
                  borderColor: "#f0f0f0",
                  rowHoverBg: "#fafafa",
                },
              },
            }}
          >
            <div>
              <Row gutter={[16, 16]} className="student-info">
                <Col xs={24} md={12}>
                  <Card size="small" className="info-card">
                    <p>
                      <Text strong>Current Semester:</Text>{" "}
                      {(currentTimetableData &&
                        currentTimetableData.semester) ||
                        userSemester ||
                        "Not assigned"}
                    </p>
                    <p>
                      <Text strong>Group:</Text>{" "}
                      {userYearGroup || "Not assigned"}
                    </p>
                    <p>
                      <Text strong>
                        <TagOutlined /> Specialization:
                      </Text>{" "}
                      <Tag color="blue">
                        {userSpecialization || "Not assigned"}
                      </Tag>
                    </p>
                  </Card>
                </Col>
                <Col xs={24} md={12}>
                  <Card size="small" className="info-card">
                    <p>
                      <Text strong>Enrolled Subjects:</Text>
                    </p>
                    <div className="subjects-list">
                      {userSubjects && userSubjects.length > 0 ? (
                        userSubjects.map((code) => {
                          const subject = subjects?.find(
                            (s) => s.code === code
                          );
                          return (
                            <Tag
                              key={code}
                              color="blue"
                              style={{ margin: "2px" }}
                            >
                              {code} - {subject?.long_name || "Unknown Subject"}
                            </Tag>
                          );
                        })
                      ) : (
                        <Text type="secondary">No subjects assigned</Text>
                      )}
                    </div>
                  </Card>
                </Col>
              </Row>

              <Tabs
                defaultActiveKey="timetable"
                className="custom-tabs"
                type="card"
              >
                <Tabs.TabPane
                  tab={
                    <span>
                      <CalendarOutlined /> Weekly Timetable
                    </span>
                  }
                  key="timetable"
                >
                  {renderTimetableTab()}
                </Tabs.TabPane>

                <Tabs.TabPane
                  tab={
                    <span>
                      <BookOutlined /> My Subjects
                    </span>
                  }
                  key="subjects"
                >
                  <div className="subjects-grid">
                    {/* Filter first by user subjects before further filtering to ensure we only show enrolled subjects */}
                    {userSubjects && userSubjects.length > 0 ? (
                      userSubjects
                        .filter((subjectCode) => {
                          // Check if this subject exists in the timetable entries
                          return currentTimetableData.entries.some(
                            (entry) =>
                              entry.subject === subjectCode &&
                              activityMatchesStudent(entry)
                          );
                        })
                        .map((subjectCode) => {
                          // Find the subject details from the subjects array
                          const subjectInfo = subjects?.find(
                            (s) => s.code === subjectCode
                          );

                          // Find all activities for this subject that match the student's criteria
                          const subjectActivities =
                            currentTimetableData.entries.filter(
                              (entry) =>
                                activityMatchesStudent(entry) &&
                                entry.subject === subjectCode
                            );

                          // Get unique activity types
                          const activityTypes = [
                            ...new Set(
                              subjectActivities.map(
                                (entry) => entry.activity_type || "Class"
                              )
                            ),
                          ];

                          return (
                            <Card
                              key={subjectCode}
                              title={subjectCode}
                              size="small"
                              className="subject-card"
                              extra={
                                <Tag color="blue">{userSpecialization}</Tag>
                              }
                            >
                              <p>
                                <BookOutlined /> <strong>Name:</strong>{" "}
                                {subjectInfo?.name || "Unknown Subject"}
                              </p>
                              {subjectInfo?.credits && (
                                <p>
                                  <strong>Credits:</strong>{" "}
                                  {subjectInfo.credits}
                                </p>
                              )}

                              <p>
                                <strong>Activity Types:</strong>{" "}
                                {activityTypes.map((type) => (
                                  <Tag
                                    key={type}
                                    color="green"
                                    style={{ marginRight: 4 }}
                                  >
                                    {type}
                                  </Tag>
                                ))}
                              </p>

                              {/* Find teachers for this subject */}
                              {(() => {
                                const teachersForSubject = [
                                  ...new Set(
                                    subjectActivities
                                      .map((entry) => entry.teacher)
                                      .filter(Boolean)
                                  ),
                                ];

                                if (teachersForSubject.length > 0) {
                                  return (
                                    <p>
                                      <TeamOutlined />{" "}
                                      <strong>Lecturer(s):</strong>{" "}
                                      {teachersForSubject
                                        .map((teacherId) => {
                                          const teacherInfo = teachers?.find(
                                            (t) => t.id === teacherId
                                          );
                                          return teacherInfo
                                            ? `${teacherInfo.first_name} ${teacherInfo.last_name}`
                                            : teacherId;
                                        })
                                        .join(", ")}
                                    </p>
                                  );
                                }
                                return null;
                              })()}
                            </Card>
                          );
                        })
                    ) : (
                      <Empty description="No subjects enrolled" />
                    )}
                  </div>
                </Tabs.TabPane>
              </Tabs>
            </div>
          </ConfigProvider>
        )}
      </Card>

      <style jsx="true">{`
        .student-dashboard-container {
          background: linear-gradient(to bottom, #f9fafb, #eef2f7);
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
          max-width: 100%;
          margin: 0 auto;
        }

        .profile-summary-card {
          margin-bottom: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          background: linear-gradient(to right, #f0f7ff, #ffffff);
        }

        .dashboard-title {
          text-align: center;
          margin-bottom: 20px;
        }

        .timetable-card {
          margin-bottom: 24px;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }

        .timetable-card-title {
          display: flex;
          align-items: center;
        }

        .timetable-badges {
          display: flex;
          margin-left: auto;
          gap: 5px;
        }

        .loading-container {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 300px;
        }

        .student-info {
          margin-bottom: 16px;
        }

        .info-card {
          height: 100%;
        }

        .subjects-list {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 8px;
        }

        .custom-tabs {
          margin-top: 16px;
        }

        .timetable-table {
          margin-top: 8px;
          border-radius: 8px;
          overflow: hidden;
        }

        .period-column {
          background-color: #f5f7fa;
        }

        .period-cell {
          font-weight: 500;
          display: flex;
          align-items: center;
        }

        .day-column {
          min-width: 120px;
        }

        .class-cell {
          padding: 5px;
          display: flex;
          flex-direction: column;
          align-items: center;
          background-color: #f0f7ff;
          border-radius: 4px;
          transition: all 0.3s;
          cursor: pointer;
        }

        .class-cell:hover {
          background-color: #e6f4ff;
          transform: scale(1.02);
        }

        .subject-tag {
          margin-bottom: 4px;
          width: 100%;
          text-align: center;
        }

        .room-text {
          font-size: 12px;
          color: #666;
          margin-bottom: 2px;
        }

        .type-text {
          font-size: 10px;
          margin-top: 2px;
        }

        .empty-cell {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 40px;
          color: #d9d9d9;
        }

        .subjects-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 16px;
        }

        .subject-card {
          background-color: white;
          transition: all 0.3s;
        }

        .subject-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
}

export default StudentDashboard;
