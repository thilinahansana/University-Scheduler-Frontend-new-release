import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Table,
  Tabs,
  Spin,
  Button,
  message,
  Card,
  Typography,
  Row,
  Col,
  Tag,
  Empty,
  Alert,
} from "antd";
import {
  CalendarOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  EnvironmentOutlined,
  BookOutlined,
  EditOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import {
  getDays,
  getPeriods,
  getSubjects,
  getSpaces,
  getTeachers,
} from "../../admin/DataManagement/data.api";
import {
  getFacultyTimetableData,
  validateFacultyInfo,
  getFacultyChangeRequests,
} from "../../admin/Timetable/timetable.api";
import EditFacultyTimetable from "./EditFacultyTimetable";

const { Title, Text } = Typography;

const FacultyTimetableView = () => {
  const { days, periods, subjects, spaces, teachers } = useSelector(
    (state) => state.data
  );
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  const [initializing, setInitializing] = useState(true);
  const [timetableLoading, setTimetableLoading] = useState(false);
  const [facultyTimetable, setFacultyTimetable] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [timetablesByDay, setTimetablesByDay] = useState({});
  const [facultyInfo, setFacultyInfo] = useState(null);
  const [validationStatus, setValidationStatus] = useState({
    loading: false,
    valid: false,
    message: "",
  });

  const dayOrder = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 7,
  };

  const sortDays = (days) => {
    if (!days || days.length === 0) return [];
    return [...days].sort((a, b) => {
      const dayA = a.name.toLowerCase();
      const dayB = b.name.toLowerCase();
      let orderA = 100;
      let orderB = 100;
      Object.keys(dayOrder).forEach((day) => {
        if (dayA.includes(day.substring(0, 3))) orderA = dayOrder[day];
        if (dayB.includes(day.substring(0, 3))) orderB = dayOrder[day];
      });
      return orderA - orderB;
    });
  };

  useEffect(() => {
    const initializeData = async () => {
      setInitializing(true);
      try {
        await Promise.all([
          dispatch(getDays()),
          dispatch(getPeriods()),
          dispatch(getSubjects()),
          dispatch(getSpaces()),
          dispatch(getTeachers()),
        ]);

        await validateFacultyInformation();

        await fetchFacultyTimetable();
      } catch (error) {
        console.error("Error initializing data:", error);
        message.error("Failed to initialize necessary data");
      } finally {
        setInitializing(false);
      }
    };

    initializeData();
  }, [dispatch]);

  const validateFacultyInformation = async () => {
    setValidationStatus((prev) => ({ ...prev, loading: true }));

    try {
      const result = await dispatch(validateFacultyInfo()).unwrap();

      setValidationStatus({
        loading: false,
        valid: result.valid,
        message: result.message,
      });

      if (result.valid && result.faculty_info) {
        setFacultyInfo(result.faculty_info);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error("Error validating faculty information:", error);

      setValidationStatus({
        loading: false,
        valid: false,
        message: error.message || "Failed to validate faculty information",
      });

      message.error("Failed to validate faculty information");
      return false;
    }
  };

  const fetchFacultyTimetable = async () => {
    setTimetableLoading(true);

    try {
      const response = await dispatch(getFacultyTimetableData()).unwrap();

      if (response.entries) {
        setFacultyTimetable(response);

        const entriesByDay = {};
        response.entries.forEach((entry) => {
          if (entry?.day?.name) {
            const dayName = entry.day.name.toLowerCase();
            if (!entriesByDay[dayName]) {
              entriesByDay[dayName] = [];
            }
            entriesByDay[dayName].push(entry);
          }
        });
        setTimetablesByDay(entriesByDay);
      }
    } catch (error) {
      console.error("Error fetching faculty timetable:", error);
      message.error("Failed to load your timetable");
    } finally {
      setTimetableLoading(false);
    }
  };

  const fetchFacultyChangeRequests = async () => {
    try {
      await dispatch(getFacultyChangeRequests());
    } catch (error) {
      console.error("Error fetching faculty change requests:", error);
    }
  };

  const handleEntryClick = (entry) => {
    setSelectedEntry(entry);
    setEditModalVisible(true);
  };

  const handleEditCancel = () => {
    setEditModalVisible(false);
    setSelectedEntry(null);
  };

  const handleEditSubmit = async (values) => {
    try {
      message.success("Your request has been submitted to admin for approval");
      setEditModalVisible(false);

      // Refresh the change requests to show the newly submitted one
      fetchFacultyChangeRequests();

      // Optionally refresh the timetable
      // though it won't change until the request is approved
      await fetchFacultyTimetable();
    } catch (error) {
      console.error("Error submitting edit request:", error);
      message.error("Failed to submit your request");
    }
  };

  const generateColumns = () => {
    return [
      {
        title: "Time",
        dataIndex: "period",
        key: "time",
        render: (period) => (
          <span>
            <ClockCircleOutlined style={{ marginRight: 8 }} />
            {Array.isArray(period) && period.length > 0
              ? `${period[0].name} - ${period[period.length - 1].name}`
              : period?.name || "Not specified"}
          </span>
        ),
      },
      {
        title: "Subject",
        dataIndex: "subject",
        key: "subject",
        render: (subject) => {
          const subjectDetails = subjects?.find((s) => s.code === subject);
          return (
            <Tag color="blue" icon={<BookOutlined />}>
              {subject}{" "}
              {subjectDetails?.long_name ? `- ${subjectDetails.long_name}` : ""}
            </Tag>
          );
        },
      },
      {
        title: "Room",
        dataIndex: "room",
        key: "room",
        render: (room) => (
          <span>
            <EnvironmentOutlined style={{ marginRight: 8 }} />
            {typeof room === "object"
              ? `${room.name} ${room.long_name ? `(${room.long_name})` : ""}`
              : room || "Not assigned"}
          </span>
        ),
      },
      {
        title: "Class",
        dataIndex: "subgroup",
        key: "subgroup",
        render: (subgroup) => (
          <span>
            <TeamOutlined style={{ marginRight: 8 }} />
            {Array.isArray(subgroup)
              ? subgroup.join(", ")
              : subgroup || "Not specified"}
          </span>
        ),
      },
      {
        title: "Actions",
        key: "actions",
        render: (_, record) => (
          <Button
            icon={<EditOutlined />}
            onClick={() => handleEntryClick(record)}
            size="small"
            type="primary"
            ghost
          >
            Request Changes
          </Button>
        ),
      },
    ];
  };

  const getTabItems = () => {
    return [
      {
        key: "weekly",
        label: "Weekly Schedule",
        children: (
          <>
            {Object.keys(timetablesByDay).length > 0 ? (
              sortDays(days).map((day) => {
                if (!day) return null;
                const dayName = day.name.toLowerCase();
                const dayEntries = timetablesByDay[dayName];

                if (!dayEntries || dayEntries.length === 0) return null;

                return (
                  <Card
                    key={dayName}
                    title={
                      <Title level={4} className="day-title">
                        <CalendarOutlined style={{ marginRight: 8 }} />
                        {day.long_name || day.name}
                      </Title>
                    }
                    className="day-card"
                  >
                    <Table
                      columns={generateColumns()}
                      dataSource={dayEntries.map((entry) => ({
                        ...entry,
                        key:
                          entry.session_id ||
                          `${entry.day.name}-${entry.subject}-${Math.random()}`,
                      }))}
                      pagination={false}
                      size="middle"
                      bordered
                      className="day-table"
                    />
                  </Card>
                );
              })
            ) : (
              <Empty
                description="No classes are scheduled for you"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </>
        ),
      },
      {
        key: "subjects",
        label: "Subject Overview",
        children: (
          <Card className="subjects-card">
            {facultyTimetable?.entries &&
            facultyTimetable.entries.length > 0 ? (
              <div className="subjects-list">
                {Array.from(
                  new Set(
                    facultyTimetable.entries
                      .filter((entry) => entry.subject)
                      .map((entry) => entry.subject)
                  )
                ).map((subjectCode) => {
                  const subjectEntries = facultyTimetable.entries.filter(
                    (entry) => entry.subject === subjectCode
                  );
                  const subjectDetails = subjects?.find(
                    (s) => s.code === subjectCode
                  );

                  return (
                    <Card
                      key={subjectCode}
                      title={
                        <span>
                          <BookOutlined style={{ marginRight: 8 }} />
                          {subjectCode} -{" "}
                          {subjectDetails?.long_name || "Unknown Subject"}
                        </span>
                      }
                      className="subject-card"
                      size="small"
                    >
                      <Table
                        columns={generateColumns()}
                        dataSource={subjectEntries.map((entry) => ({
                          ...entry,
                          key:
                            entry.session_id ||
                            `${entry.day?.name || "day"}-${
                              entry.subject
                            }-${Math.random()}`,
                        }))}
                        pagination={false}
                        size="small"
                      />
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Empty description="No subjects assigned" />
            )}
          </Card>
        ),
      },
    ];
  };

  if (initializing) {
    return (
      <div className="faculty-timetable-view">
        <div className="page-header">
          <Title level={2} style={{ color: "#fff" }}>
            Your Teaching Schedule
          </Title>
          <Text type="secondary" style={{ color: "#fff" }}>
            View your teaching schedule and request changes if needed
          </Text>
        </div>
        <Card className="info-card">
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Text>Initializing application data...</Text>
            </Col>
          </Row>
        </Card>
      </div>
    );
  }

  return (
    <div className="faculty-timetable-view">
      <div className="page-header">
        <Title level={2} style={{ color: "#fff" }}>
          Your Teaching Schedule
        </Title>
        <Text type="secondary" style={{ color: "#fff" }}>
          View your teaching schedule and request changes if needed
        </Text>
      </div>

      <div className="faculty-info">
        <Card className="info-card">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <div className="faculty-name">
                <Title level={4}>
                  {facultyTimetable?.faculty_name ||
                    facultyInfo?.name ||
                    `${user?.first_name || ""} ${user?.last_name || ""}`}
                </Title>
                <Text>
                  {facultyTimetable?.faculty_position ||
                    facultyInfo?.position ||
                    user?.position ||
                    "Faculty Member"}
                </Text>
                {!validationStatus.valid && !validationStatus.loading && (
                  <Alert
                    message="Profile Incomplete"
                    description={
                      validationStatus.message ||
                      "Your faculty profile information is incomplete. Some features may be limited."
                    }
                    type="warning"
                    showIcon
                    style={{ marginTop: 16 }}
                  />
                )}
              </div>
            </Col>
            <Col xs={24} md={12} className="action-buttons">
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchFacultyTimetable}
                loading={timetableLoading}
                type="primary"
              >
                Refresh Timetable
              </Button>
            </Col>
          </Row>
        </Card>
      </div>

      {facultyInfo && Object.keys(facultyInfo).length > 0 && (
        <Card className="faculty-details-card" style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <p>
                <strong>Faculty ID:</strong> {facultyInfo.id || "Not available"}
              </p>
              <p>
                <strong>Email:</strong>{" "}
                {facultyInfo.email || user?.email || "Not available"}
              </p>
            </Col>
            <Col xs={24} md={12}>
              <p>
                <strong>Phone:</strong> {facultyInfo.phone || "Not available"}
              </p>
              <p>
                <strong>Subjects:</strong>{" "}
                {Array.isArray(facultyInfo.subjects)
                  ? facultyInfo.subjects.map((s) => (
                      <Tag color="blue" key={s}>
                        {s}
                      </Tag>
                    ))
                  : "Not assigned"}
              </p>
            </Col>
          </Row>
        </Card>
      )}

      <Card className="schedule-tabs-container">
        {timetableLoading ? (
          <div className="timetable-loading-container">
            <Spin size="large" tip="Loading your schedule...">
              <div className="timetable-loading-content" />
            </Spin>
          </div>
        ) : (
          <Tabs
            defaultActiveKey="weekly"
            className="schedule-tabs"
            items={getTabItems()}
          />
        )}
      </Card>

      {editModalVisible && selectedEntry && (
        <EditFacultyTimetable
          visible={editModalVisible}
          entry={selectedEntry}
          onCancel={handleEditCancel}
          onSubmit={handleEditSubmit}
        />
      )}

      <style jsx="true">{`
        .faculty-timetable-view {
          padding: 24px;
        }

        .page-header {
          margin-bottom: 24px;
        }

        .timetable-loading-container {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 300px;
        }

        .timetable-loading-content {
          padding: 50px;
          background: rgba(0, 0, 0, 0.05);
          border-radius: 4px;
          width: 300px;
          height: 200px;
        }

        .faculty-info {
          margin-bottom: 24px;
        }

        .info-card {
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }

        .faculty-name {
          display: flex;
          flex-direction: column;
        }

        .action-buttons {
          display: flex;
          justify-content: flex-end;
          align-items: center;
        }

        .schedule-tabs-container {
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          padding: 0;
          overflow: hidden;
        }

        .schedule-tabs {
          padding: 16px;
          background: white;
        }

        .day-card {
          margin-bottom: 16px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }

        .day-title {
          margin: 0;
        }

        .day-table {
          margin-top: 8px;
        }

        .subjects-card {
          border-radius: 8px;
        }

        .subjects-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .subject-card {
          border-radius: 8px;
        }
      `}</style>
    </div>
  );
};

export default FacultyTimetableView;
