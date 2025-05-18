import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Table,
  ConfigProvider,
  Tabs,
  Spin,
  Button,
  message,
  Popover,
  Card,
  Badge,
  Typography,
  Row,
  Col,
  Tag,
  Modal,
  Space,
  Tooltip,
} from "antd";
import {
  getDays,
  getPeriods,
  getSubjects,
  getSpaces,
  getTeachers,
} from "../DataManagement/data.api";
import {
  getTimetable,
  llmResponse,
  getSelectedAlgorithm,
  selectAlgorithm,
  editTimetable,
  publishTimetable, // Added import
  getPublishedTimetable, // Added import
} from "./timetable.api";
import EditTimetableModal from "./EditTimetable";
import ConflictDetailsModal from "./ConflictDetailsModal";
import {
  CheckCircleFilled,
  BarChartOutlined,
  CalendarOutlined,
  InfoCircleOutlined,
  CloudUploadOutlined, // Added icon for publish
  ExclamationCircleOutlined, // Added icon for confirmation
} from "@ant-design/icons";

const { Title, Text } = Typography;
const { confirm } = Modal;

const ViewTimetable = () => {
  const { days, periods, subjects, teachers, spaces } = useSelector(
    (state) => state.data
  );
  const {
    timetable,
    evaluation,
    loading,
    selectedAlgorithm: selectedAlgorithmFromState,
  } = useSelector((state) => state.timetable);
  const dispatch = useDispatch();
  const algorithms = ["GA", "CO", "RL", "BC", "PSO"];
  const [nlResponse, setNlResponse] = useState("");
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [selectedTimetableId, setSelectedTimetableId] = useState(null);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [conflictModalVisible, setConflictModalVisible] = useState(false);
  const [publishedTimetable, setPublishedTimetable] = useState(null);
  const [publishLoading, setPublishLoading] = useState({});

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
    return [...days].sort((a, b) => {
      // Try to match exact name or part of the name for case insensitivity
      const dayA = a.name.toLowerCase();
      const dayB = b.name.toLowerCase();

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

      // Default to alphabetical sort
      return a.name.localeCompare(b.name);
    });
  };

  useEffect(() => {
    dispatch(getDays());
    dispatch(getPeriods());
    dispatch(getTimetable());
    dispatch(getSubjects());
    dispatch(getSpaces());
    dispatch(getTeachers());
    dispatch(getSelectedAlgorithm());

    // Get information about currently published timetable
    fetchPublishedTimetable();
  }, [dispatch]);

  // Fetch published timetable info
  const fetchPublishedTimetable = async () => {
    try {
      const result = await dispatch(getPublishedTimetable()).unwrap();
      setPublishedTimetable(result);
    } catch (error) {
      console.error("Failed to fetch published timetable info:", error);
    }
  };

  useEffect(() => {
    const fetchllmresponse = async () => {
      if (evaluation) {
        const result = await llmResponse(evaluation);
        setNlResponse(result);
      }
    };
    fetchllmresponse();
  }, [evaluation]);

  // Algorithm display info
  const algorithmInfo = {
    GA: {
      name: "Genetic Algorithm",
      color: "#8e44ad",
      description: "NSGAII",
    },
    CO: {
      name: "Ant Colony Optimization",
      color: "#e67e22",
      description: "",
    },
    RL: {
      name: "Reinforcement Learning",
      color: "#3498db",
      description: "",
    },
    BC: {
      name: "Bee Colony Optimization",
      color: "#f1c40f",
      description: "",
    },
    PSO: {
      name: "Particle Swarm Optimization",
      color: "#2ecc71",
      description: "",
    },
  };

  const generateColumns = (days, timetableId, algorithm) => {
    // Sort days using the custom sort function to ensure Monday to Friday order
    const sortedDays = sortDays(days);

    return [
      {
        title: "Periods",
        dataIndex: "period",
        key: "period",
        width: 150,
        className: "period-column",
        render: (text) => (
          <div className="period-cell">
            <CalendarOutlined style={{ marginRight: 8 }} />
            {text}
          </div>
        ),
      },
      ...sortedDays.map((day) => ({
        title: day.long_name,
        dataIndex: day.name,
        key: day.name,
        className: "day-column",
        render: (value) => {
          if (value && value.length > 0) {
            return (
              <Popover
                content={
                  <div
                    className="activity-popover-content"
                    style={{
                      maxHeight: "400px",
                      overflowY: "auto",
                      width: value.length > 1 ? "500px" : "300px",
                      padding: "10px",
                    }}
                  >
                    <div
                      className={value.length > 1 ? "activity-grid" : ""}
                      style={{
                        display: value.length > 1 ? "grid" : "block",
                        gridTemplateColumns:
                          value.length > 3 ? "1fr 1fr" : "1fr",
                        gap: "15px",
                      }}
                    >
                      {value.map((activity, index) => {
                        const subject = subjects?.find(
                          (s) => s.code === activity.subject
                        );
                        const room = spaces?.find(
                          (r) => r.name === activity.room.name
                        );
                        const teacher = teachers?.find(
                          (t) => t.id === activity.teacher
                        );

                        return (
                          <div
                            key={index}
                            onClick={() => {
                              handleCellClick(
                                {
                                  ...activity,
                                  subject: subject?.code,
                                  subject_name: subject?.long_name,
                                  room: {
                                    _id: room?._id,
                                    name: room?.name,
                                    code: room?.code,
                                    long_name: room?.long_name,
                                  },
                                  teacher: {
                                    id: teacher?.id,
                                    first_name: teacher?.first_name,
                                    last_name: teacher?.last_name,
                                    position: teacher?.position,
                                  },
                                },
                                day.name,
                                algorithm,
                                timetableId
                              );
                            }}
                            className="activity-popover-item"
                          >
                            <div className="activity-popover-header">
                              {activity.title}
                            </div>
                            <div className="activity-popover-details">
                              <p>
                                <strong>Subject:</strong> {subject?.long_name}
                              </p>
                              <p>
                                <strong>Room:</strong> {room?.long_name} (
                                {room?.code})
                              </p>
                              <p>
                                <strong>Teacher:</strong> {teacher?.first_name}{" "}
                                {teacher?.last_name} ({teacher?.position})
                              </p>
                              <p>
                                <strong>Duration:</strong> {activity.duration}{" "}
                                hours
                              </p>
                              <Button
                                type="link"
                                size="small"
                                className="edit-button"
                              >
                                Edit
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                }
                title={
                  <span>
                    <CalendarOutlined /> {day.long_name} Schedule
                  </span>
                }
                placement="right"
                overlayStyle={{ maxWidth: "800px" }}
                overlayClassName="activity-popover"
              >
                <div className="timetable-cell">
                  {value.map((activity, index) => (
                    <Tag
                      key={index}
                      color={index % 2 === 0 ? "#1677ff" : "#52c41a"}
                      className="activity-tag"
                    >
                      {activity.title}
                    </Tag>
                  ))}
                </div>
              </Popover>
            );
          }
          return <div className="empty-cell">-</div>;
        },
      })),
    ];
  };

  const generateDataSource = (semesterTimetable, days, periods) => {
    // Sort periods and days
    const sortedPeriods = sortPeriods(periods);
    const sortedDays = sortDays(days);

    return sortedPeriods.map((period) => ({
      key: period.name,
      period: period.long_name,
      ...sortedDays.reduce((acc, day) => {
        const activities = semesterTimetable.filter(
          (entry) =>
            entry.day.name === day.name &&
            entry.period.some((p) => p.name === period.name)
        );
        acc[day.name] = activities.length
          ? activities.map((activity) => ({
              ...activity,
              title: `${activity.subject} (${activity.room.name})`,
              period: activity.period.map((p) => p.name),
              duration: activity.duration,
            }))
          : null;
        return acc;
      }, {}),
    }));
  };

  const getSemName = (semester) => {
    const year = parseInt(semester.substring(3, 4));
    const sem = parseInt(semester.substring(4, 6));
    return { year, sem };
  };

  const handleCellClick = async (activity, dayName, algorithm, timetableId) => {
    if (!activity) return;

    // Fetch all timetables for this algorithm to ensure comprehensive conflict checking
    // await dispatch(getAlgorithmTimetables(algorithm));

    const selectedSubject = subjects?.find((s) => s.code === activity.subject);
    const selectedRoom = spaces?.find((r) => r.name === activity.room.name);
    const selectedTeacher = teachers?.find((t) => t.id === activity.teacher.id);

    const formattedActivity = {
      ...activity,
      day: dayName,
      sessionId: activity.session_id,
      subject: activity.subject,
      subject_name: selectedSubject?.long_name,
      room: activity.room.name,
      teacher: selectedTeacher?.id,
      period: activity.period,
      duration: activity.duration,
      subgroup: activity.subgroup,
      activity_id: activity.activity_id,
    };

    setSelectedActivity(formattedActivity);
    setSelectedAlgorithm(algorithm);
    setSelectedTimetableId(timetableId);
    setEditModalVisible(true);
  };

  const handleEditSubmit = async (updatedActivity) => {
    try {
      // The updatedActivity is already in the correct format from the EditTimetableModal
      console.log("updatedActivity", updatedActivity);

      const response = await dispatch(
        editTimetable({
          timetableId: selectedTimetableId,
          timetableData: updatedActivity,
          sessionId: updatedActivity.session_id,
        })
      ).unwrap();

      console.log(response);

      if (
        response.message === "Conflicts detected. Changes were not saved." &&
        response.conflicts
      ) {
        setConflicts(response.conflicts);
        setConflictModalVisible(true);
      } else if (response.detail) {
        try {
          // Try to parse conflicts from detail string if they're embedded
          const detailObject =
            typeof response.detail === "string"
              ? JSON.parse(response.detail.replace(/'/g, '"'))
              : response.detail;

          if (detailObject.conflicts) {
            setConflicts(detailObject.conflicts);
            setConflictModalVisible(true);
          } else {
            const conflictDescription =
              response.detail.match(/description': "(.*?)"/)?.[1] ||
              "Unknown conflict";
            message.error("Conflicts detected: " + conflictDescription);
          }
        } catch (e) {
          // Fallback to original behavior
          const conflictDescription =
            response.detail.match(/description': "(.*?)"/)?.[1] ||
            "Unknown conflict";
          message.error("Conflicts detected: " + conflictDescription);
        }
      } else {
        message.success("Timetable updated successfully");
        setEditModalVisible(false);
        dispatch(getTimetable());
      }
    } catch (error) {
      if (
        error.message === "Conflicts detected. Changes were not saved." &&
        error.conflicts
      ) {
        setConflicts(error.conflicts);
        setConflictModalVisible(true);
      } else if (error.detail) {
        try {
          // Try to parse conflicts from detail string if they're embedded
          const detailObject =
            typeof error.detail === "string"
              ? JSON.parse(error.detail.replace(/'/g, '"'))
              : error.detail;

          if (detailObject.conflicts) {
            setConflicts(detailObject.conflicts);
            setConflictModalVisible(true);
          } else {
            const conflictDescription =
              error.detail.match(/description': "(.*?)"/)?.[1] ||
              "Unknown error";
            message.error("Failed to update timetable: " + conflictDescription);
          }
        } catch (e) {
          // Fallback to original behavior
          const conflictDescription =
            error.detail.match(/description': "(.*?)"/)?.[1] || "Unknown error";
          message.error("Failed to update timetable: " + conflictDescription);
        }
      } else {
        message.error(
          "Failed to update timetable: " + (error.message || "Unknown error")
        );
      }
    }
  };

  const handleEditCancel = () => {
    setEditModalVisible(false);
  };

  const handleConflictModalClose = () => {
    setConflictModalVisible(false);
  };

  // Handle publish timetable
  const handlePublishTimetable = (algorithm) => {
    confirm({
      title: "Publish Timetable",
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to publish the ${algorithmInfo[algorithm].name} timetable? This will make it visible to all students and faculty members.`,
      onOk() {
        return publishSelectedTimetable(algorithm);
      },
      onCancel() {
        // Do nothing
      },
    });
  };

  const publishSelectedTimetable = async (algorithm) => {
    try {
      // Set loading state for this specific algorithm
      setPublishLoading((prev) => ({ ...prev, [algorithm]: true }));

      const result = await dispatch(publishTimetable(algorithm)).unwrap();

      if (result.success) {
        message.success(result.message);
        fetchPublishedTimetable(); // Refresh published timetable info
      } else {
        message.error(result.message || "Failed to publish timetable");
      }
    } catch (error) {
      const errorMsg =
        error.detail ||
        error.message ||
        "An error occurred while publishing the timetable";
      message.error(errorMsg);
    } finally {
      // Clear loading state
      setPublishLoading((prev) => ({ ...prev, [algorithm]: false }));
    }
  };

  // Check if algorithm is currently published
  const isPublished = (algorithm) => {
    return (
      publishedTimetable?.published &&
      publishedTimetable.algorithm === algorithm
    );
  };

  return (
    <div className="timetable-container">
      {loading && (
        <div className="loading-container">
          <Spin size="large" tip="Loading timetable data..." />
        </div>
      )}

      {!loading && (
        <>
          <div className="page-header">
            <Title level={2}>University Timetable System</Title>
            <Text type="secondary">
              Compare different scheduling algorithms and select the best option
            </Text>
          </div>

          <div className="algorithm-selector">
            <Title level={4} className="section-title">
              <BarChartOutlined /> Scheduling Algorithms
            </Title>
            <Row gutter={[16, 16]} className="algorithm-cards">
              {algorithms.map((algorithm) => (
                <Col xs={24} sm={12} md={8} lg={8} xl={4} key={algorithm}>
                  <Card
                    className={`algorithm-card ${
                      selectedAlgorithmFromState?.selected_algorithm ===
                      algorithm
                        ? "selected-algorithm"
                        : ""
                    } ${isPublished(algorithm) ? "published-algorithm" : ""}`}
                    style={{
                      borderTop: `3px solid ${algorithmInfo[algorithm].color}`,
                      backgroundColor:
                        selectedAlgorithmFromState?.selected_algorithm ===
                        algorithm
                          ? "#f6ffed"
                          : isPublished(algorithm)
                          ? "#f0f7ff"
                          : "white",
                    }}
                  >
                    <div className="algorithm-card-content">
                      <div className="algorithm-name">
                        <strong>{algorithmInfo[algorithm].name}</strong>
                        {algorithmInfo[algorithm].description && (
                          <div className="algorithm-description">
                            {algorithmInfo[algorithm].description}
                          </div>
                        )}
                      </div>
                      <div className="algorithm-score">
                        {evaluation && (
                          <Text strong>
                            {evaluation[algorithm]?.average_score.toFixed(2)}
                          </Text>
                        )}
                      </div>

                      {/* Status badges */}
                      <div className="algorithm-badges">
                        {selectedAlgorithmFromState?.selected_algorithm ===
                          algorithm && (
                          <Badge status="success" text="Selected" />
                        )}
                        {isPublished(algorithm) && (
                          <Badge
                            status="processing"
                            color="#1677ff"
                            text="Published"
                          />
                        )}
                      </div>

                      {/* Action buttons */}
                      <Space
                        className="algorithm-actions"
                        direction="vertical"
                        style={{ width: "100%" }}
                      >
                        {selectedAlgorithmFromState?.selected_algorithm ===
                        algorithm ? (
                          <Button type="primary" className="selected-button">
                            Current
                          </Button>
                        ) : (
                          <Button
                            type="default"
                            onClick={() => {
                              dispatch(selectAlgorithm(algorithm));
                              dispatch(getSelectedAlgorithm());
                            }}
                            className="select-button"
                          >
                            Select
                          </Button>
                        )}

                        {/* Publish button */}
                        <Tooltip
                          title={
                            isPublished(algorithm)
                              ? "This timetable is already published"
                              : "Publish this timetable for all students and faculty"
                          }
                        >
                          <Button
                            type={
                              isPublished(algorithm) ? "primary" : "default"
                            }
                            icon={<CloudUploadOutlined />}
                            onClick={() => handlePublishTimetable(algorithm)}
                            loading={publishLoading[algorithm]}
                            disabled={isPublished(algorithm)}
                            className={
                              isPublished(algorithm)
                                ? "published-button"
                                : "publish-button"
                            }
                            ghost={isPublished(algorithm)}
                          >
                            {isPublished(algorithm) ? "Published" : "Publish"}
                          </Button>
                        </Tooltip>
                      </Space>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>

          <div className="timetable-tabs-container">
            {algorithms.map((algorithm) => (
              <div
                key={algorithm}
                className={`timetable-algorithm-section ${
                  selectedAlgorithmFromState?.selected_algorithm === algorithm
                    ? "active-algorithm"
                    : ""
                } ${isPublished(algorithm) ? "published-section" : ""}`}
              >
                <Title
                  level={4}
                  className="algorithm-title"
                  style={{ color: algorithmInfo[algorithm].color }}
                >
                  {algorithmInfo[algorithm].name} Schedule
                  {selectedAlgorithmFromState?.selected_algorithm ===
                    algorithm && (
                    <Tag color="success" className="selected-tag">
                      Active
                    </Tag>
                  )}
                  {isPublished(algorithm) && (
                    <Tag
                      color="blue"
                      icon={<CloudUploadOutlined />}
                      className="published-tag"
                    >
                      Published
                    </Tag>
                  )}
                </Title>

                <ConfigProvider
                  theme={{
                    components: {
                      Tabs: {
                        itemSelectedColor: "#1677ff",
                        itemHoverColor: "#1677ff",
                        inkBarColor: "#1677ff",
                      },
                    },
                  }}
                >
                  <Tabs type="card" className="semester-tabs">
                    {timetable?.map((semesterTimetable) => {
                      if (semesterTimetable.algorithm !== algorithm)
                        return null;
                      const semester = semesterTimetable.semester;

                      // Use the sorting functions here
                      const columns = generateColumns(
                        days,
                        semesterTimetable._id,
                        algorithm
                      );
                      const dataSource = generateDataSource(
                        semesterTimetable.timetable,
                        days,
                        periods
                      );

                      return (
                        <Tabs.TabPane
                          tab={
                            <span>
                              <CalendarOutlined /> Year{" "}
                              {getSemName(semester).year} Semester{" "}
                              {getSemName(semester).sem}
                            </span>
                          }
                          key={semester}
                        >
                          <ConfigProvider
                            theme={{
                              components: {
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
                            <Table
                              columns={columns}
                              dataSource={dataSource}
                              pagination={false}
                              bordered
                              size="middle"
                              className="timetable-table"
                            />
                          </ConfigProvider>
                        </Tabs.TabPane>
                      );
                    })}
                  </Tabs>
                </ConfigProvider>
              </div>
            ))}
          </div>
        </>
      )}

      {!loading && (
        <Card className="evaluation-card">
          <Title level={4} className="section-title">
            <BarChartOutlined /> Algorithm Evaluation
          </Title>

          <div className="algorithm-scores">
            <Row gutter={[16, 16]}>
              {algorithms.map((algorithm) => (
                <Col xs={24} sm={12} md={8} key={algorithm}>
                  <Card className="score-card" bordered={false}>
                    <div
                      className="score-header"
                      style={{
                        backgroundColor: algorithmInfo[algorithm].color,
                      }}
                    >
                      {algorithmInfo[algorithm].name}
                    </div>
                    <div className="score-value">
                      {evaluation && evaluation[algorithm] ? (
                        <span className="score-number">
                          {evaluation[algorithm].average_score.toFixed(2)}
                        </span>
                      ) : (
                        <span className="score-number">-</span>
                      )}
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>

          <div className="recommendation-section">
            <Card className="recommendation-card">
              <Title level={5}>
                <InfoCircleOutlined /> AI Recommendation
              </Title>
              <div className="recommendation-text">
                {nlResponse ? nlResponse : "Loading recommendation..."}
              </div>
            </Card>
          </div>
        </Card>
      )}

      <EditTimetableModal
        visible={editModalVisible}
        onCancel={handleEditCancel}
        onSubmit={handleEditSubmit}
        initialData={selectedActivity}
        timetableId={selectedTimetableId}
        algorithm={selectedAlgorithm}
      />

      <ConflictDetailsModal
        visible={conflictModalVisible}
        onClose={handleConflictModalClose}
        conflicts={conflicts}
      />

      <style jsx="true">{`
        .timetable-container {
          background: linear-gradient(to bottom, #f9fafb, #eef2f7);
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
          max-width: 100%;
          margin: 0 auto;
        }

        .page-header {
          text-align: center;
          margin-bottom: 28px;
          padding-bottom: 16px;
          border-bottom: 1px solid #eaeaea;
        }

        .section-title {
          margin-bottom: 20px;
          color: #1a1a1a;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .loading-container {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 400px;
        }

        .algorithm-selector {
          margin-bottom: 30px;
          padding: 16px;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }

        .algorithm-cards {
          margin-top: 16px;
        }

        .algorithm-card {
          transition: all 0.3s ease;
          height: 100%;
        }

        .algorithm-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .selected-algorithm {
          border-color: #52c41a;
        }

        .algorithm-card-content {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
          gap: 8px;
        }

        .algorithm-badges {
          margin-top: 4px;
          margin-bottom: 4px;
        }

        .algorithm-actions {
          margin-top: 8px;
        }

        .select-button,
        .publish-button,
        .selected-button,
        .published-button {
          width: 100%;
        }

        .published-button {
          color: #1677ff;
          border-color: #1677ff;
        }

        .selected-button {
          background-color: #52c41a;
          border-color: #52c41a;
        }

        .published-algorithm {
          box-shadow: 0 0 0 2px #1677ff;
        }

        .published-section {
          border-left: 4px solid #1677ff;
        }

        .published-tag {
          margin-left: 8px;
        }

        .timetable-tabs-container {
          margin-bottom: 30px;
        }

        .timetable-algorithm-section {
          background-color: white;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          opacity: 0.85;
          transition: all 0.3s ease;
        }

        .timetable-algorithm-section:hover,
        .active-algorithm {
          opacity: 1;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
        }

        .algorithm-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .selected-tag {
          margin-left: 8px;
        }

        .semester-tabs {
          margin-top: 16px;
        }

        .timetable-table {
          margin-top: 8px;
          overflow: hidden;
          border-radius: 8px;
        }

        .period-column {
          background-color: #f5f7fa;
        }

        .period-cell {
          font-weight: 500;
          color: #1a1a1a;
          display: flex;
          align-items: center;
        }

        .day-column {
          min-width: 120px;
        }

        .timetable-cell {
          padding: 5px 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
          align-items: center;
          min-height: 40px;
        }

        .activity-tag {
          cursor: pointer;
          width: 100%;
          text-align: center;
          margin: 2px 0;
          transition: all 0.2s;
        }

        .activity-tag:hover {
          transform: scale(1.05);
        }

        .empty-cell {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 40px;
          color: #d9d9d9;
        }

        .activity-popover {
          max-width: 800px;
        }

        .activity-popover-item {
          cursor: pointer;
          padding: 12px;
          border-radius: 6px;
          background-color: #f9fafb;
          margin-bottom: 8px;
          transition: all 0.2s;
          border: 1px solid #f0f0f0;
        }

        .activity-popover-item:hover {
          background-color: #f0f7ff;
          border-color: #91caff;
        }

        .activity-popover-header {
          font-weight: bold;
          margin-bottom: 8px;
          font-size: 16px;
          color: #1677ff;
        }

        .activity-popover-details p {
          margin: 4px 0;
          color: #666;
        }

        .edit-button {
          margin-top: 8px;
          padding: 0;
        }

        .evaluation-card {
          margin-top: 24px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }

        .algorithm-scores {
          margin-top: 16px;
        }

        .score-card {
          border-radius: 8px;
          overflow: hidden;
          background-color: white;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
        }

        .score-header {
          padding: 12px;
          color: white;
          text-align: center;
          font-weight: 500;
          border-radius: 8px 8px 0 0;
        }

        .score-value {
          padding: 16px;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 80px;
        }

        .score-number {
          font-size: 32px;
          font-weight: bold;
        }

        .recommendation-section {
          margin-top: 24px;
        }

        .recommendation-card {
          background-color: #f6ffed;
          border: 1px solid #b7eb8f;
        }

        .recommendation-text {
          font-size: 16px;
          line-height: 1.6;
          margin-top: 12px;
          padding: 8px;
          background-color: white;
          border-radius: 4px;
          border-left: 4px solid #52c41a;
        }
      `}</style>
    </div>
  );
};

export default ViewTimetable;
