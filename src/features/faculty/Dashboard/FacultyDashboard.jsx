import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Empty,
  Badge,
  Space,
  Tabs,
  Spin,
  Table,
  Tag,
  List,
} from "antd";
import {
  CalendarOutlined,
  RightOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  BookOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import { getDays } from "../../admin/DataManagement/data.api";
import {
  getFacultyTimetableData,
  getFacultyChangeRequests,
} from "../../admin/Timetable/timetable.api";

const { Title, Text } = Typography;

const FacultyDashboard = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [dataInitialized, setDataInitialized] = useState(false);
  const [timetableLoading, setTimetableLoading] = useState(false);
  const [facultyTimetable, setFacultyTimetable] = useState(null);
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [timetablesByDay, setTimetablesByDay] = useState({});
  const [changeRequests, setChangeRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  useEffect(() => {
    const initializeData = async () => {
      await dispatch(getDays());
      setDataInitialized(true);
      await fetchFacultyTimetable();
      await fetchChangeRequests();
    };

    initializeData();
  }, [dispatch]);

  const fetchFacultyTimetable = async () => {
    setTimetableLoading(true);

    try {
      const response = await dispatch(getFacultyTimetableData()).unwrap();

      console.log("Faculty Timetable Response:", response);
      if (response?.entries) {
        setFacultyTimetable(response);

        const entriesByDay = {};
        response.entries.forEach((entry) => {
          if (entry?.day?.name) {
            const dayName = entry.day.long_name.toLowerCase();
            if (!entriesByDay[dayName]) {
              entriesByDay[dayName] = [];
            }
            entriesByDay[dayName].push(entry);
          }
        });

        setTimetablesByDay(entriesByDay);

        const today = new Date()
          .toLocaleDateString("en-US", { weekday: "long" })
          .toLowerCase();
        setTodaySchedule(entriesByDay[today] || []);
      }
    } catch (error) {
      console.error("Error fetching faculty timetable:", error);
    } finally {
      setTimetableLoading(false);
    }
  };

  const fetchChangeRequests = async () => {
    setRequestsLoading(true);
    try {
      const response = await dispatch(getFacultyChangeRequests()).unwrap();
      if (response?.requests) {
        setChangeRequests(response.requests);
      }
    } catch (error) {
      console.error("Error fetching change requests:", error);
    } finally {
      setRequestsLoading(false);
    }
  };

  const getWeeklyTabItems = () => [
    {
      key: "weekly",
      label: "Weekly Overview",
      children: (
        <div>
          {Object.keys(timetablesByDay).length > 0 ? (
            Object.entries(timetablesByDay).map(([day, entries]) => (
              <Card
                key={day}
                title={
                  <Text strong>
                    {day.charAt(0).toUpperCase() + day.slice(1)}
                  </Text>
                }
                style={{ marginBottom: 16 }}
                size="small"
              >
                {entries.length > 0 ? (
                  <ul className="weekly-overview-list">
                    {entries.map((entry, index) => (
                      <li key={index}>
                        <Tag color="blue">{entry.subject}</Tag>
                        <span>
                          {Array.isArray(entry.period) &&
                          entry.period.length > 0
                            ? `${entry.period[0].name} - ${
                                entry.period[entry.period.length - 1].name
                              }`
                            : entry.period?.name || "Not specified"}
                        </span>
                        <span className="room-info">
                          {typeof entry.room === "object"
                            ? entry.room?.name
                            : entry.room || "TBA"}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Text type="secondary">No classes scheduled</Text>
                )}
              </Card>
            ))
          ) : (
            <Empty
              description="No weekly schedule available"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <Link to="/faculty/timetable">
              <Button type="primary" icon={<CalendarOutlined />}>
                Open Complete Schedule
              </Button>
            </Link>
          </div>
        </div>
      ),
    },
    {
      key: "requests",
      label: (
        <span>
          Change Requests
          {changeRequests.filter((req) => req.status === "pending").length >
            0 && (
            <Badge
              count={
                changeRequests.filter((req) => req.status === "pending").length
              }
              style={{ marginLeft: 5 }}
            />
          )}
        </span>
      ),
      children: (
        <div>
          {requestsLoading ? (
            <div style={{ padding: 24, textAlign: "center" }}>
              <Spin size="small" />
              <div style={{ marginTop: 8 }}>Loading requests...</div>
            </div>
          ) : changeRequests.length > 0 ? (
            <List
              dataSource={changeRequests}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Tag
                      color={
                        item.status === "pending"
                          ? "gold"
                          : item.status === "approved"
                          ? "green"
                          : "red"
                      }
                    >
                      {item.status === "pending" && (
                        <ExclamationCircleOutlined />
                      )}
                      {item.status === "approved" && <CheckCircleOutlined />}
                      {item.status === "rejected" && (
                        <CloseCircleOutlined />
                      )}{" "}
                      {item.status.charAt(0).toUpperCase() +
                        item.status.slice(1)}
                    </Tag>,
                  ]}
                >
                  <List.Item.Meta
                    title={getRequestTitle(item)}
                    description={
                      <>
                        <div>
                          <strong>Reason:</strong> {item.reason}
                        </div>
                        <div>
                          <strong>Submitted:</strong>{" "}
                          {new Date(item.submitted_at).toLocaleString()}
                        </div>
                        {item.type === "substitute" && item.substitute_name && (
                          <div>
                            <strong>Substitute:</strong> {item.substitute_name}
                          </div>
                        )}
                        {item.type === "roomChange" && item.new_room && (
                          <div>
                            <strong>New Room:</strong> {item.new_room}
                          </div>
                        )}
                        {item.admin_comments && (
                          <div>
                            <strong>Admin comments:</strong>{" "}
                            {item.admin_comments}
                          </div>
                        )}
                      </>
                    }
                  />
                </List.Item>
              )}
            />
          ) : (
            <Empty description="No change requests submitted" />
          )}
        </div>
      ),
    },
  ];

  const getRequestTitle = (request) => {
    switch (request.type) {
      case "substitute":
        return "Teacher Substitution Request";
      case "roomChange":
        return "Room Change Request";
      case "timeChange":
        return "Schedule Time/Day Change Request";
      default:
        return `${
          request.type.charAt(0).toUpperCase() + request.type.slice(1)
        } Request`;
    }
  };

  const todayColumns = [
    {
      title: "Time",
      dataIndex: "period",
      key: "time",
      render: (period) => (
        <span className="flex flex-row">
          <ClockCircleOutlined style={{ marginRight: 8 }} />
          <div className="flex flex-col">
            {Array.isArray(period) && period.length > 0 ? (
              period.map((p, index) => <div key={index}>{p.long_name}</div>)
            ) : (
              <div>{period?.name || "Not specified"}</div>
            )}
          </div>
        </span>
      ),
    },
    {
      title: "Subject",
      dataIndex: "subject",
      key: "subject",
      render: (subject, record) => (
        <div>
          <Tag color="blue" icon={<BookOutlined />}>
            {subject}
          </Tag>
          {record.activity_type && (
            <Tag color="purple" style={{ marginLeft: 4 }}>
              {record.activity_type}
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: "Room",
      dataIndex: "room",
      key: "room",
      render: (room) => (
        <span>
          <EnvironmentOutlined style={{ marginRight: 8 }} />
          {typeof room === "object" ? room.name : room || "Not assigned"}
          {typeof room === "object" && room.long_name && (
            <div>
              <small>({room.long_name})</small>
            </div>
          )}
        </span>
      ),
    },
    {
      title: "Students",
      dataIndex: "student_count",
      key: "student_count",
      render: (count, record) => (
        <span>
          {count || "N/A"}
          {record.subgroup && record.subgroup.length > 0 && (
            <div>
              <small>{record.subgroup.join(", ")}</small>
            </div>
          )}
        </span>
      ),
    },
  ];

  const getTodayStats = () => {
    if (!todaySchedule || todaySchedule.length === 0) return null;

    const totalClasses = todaySchedule.length;
    const totalHours = todaySchedule.reduce(
      (total, item) =>
        total +
        (item.duration ||
          (Array.isArray(item.period) ? item.period.length : 1)),
      0
    );
    const totalStudents = todaySchedule.reduce(
      (total, item) => total + (item.student_count || 0),
      0
    );

    return { totalClasses, totalHours, totalStudents };
  };

  return (
    <div className="faculty-dashboard">
      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Card className="faculty-info-card">
            <Row align="middle">
              <Col flex="auto">
                <Title level={2} style={{ margin: 0 }}>
                  Faculty Dashboard
                </Title>
                <Text>
                  Welcome,{" "}
                  {user?.first_name && user?.last_name
                    ? `${user.first_name} ${user.last_name}`
                    : "Faculty Member"}{" "}
                  ({user?.position || "Faculty"})
                </Text>
              </Col>
              <Col>
                <Space>
                  <Badge status="processing" text="Active Semester" />
                </Space>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col span={24}>
          <Card
            title={
              <Title level={4}>
                <CalendarOutlined style={{ marginRight: 8 }} />
                Today's Schedule
              </Title>
            }
            extra={
              <Link to="/faculty/timetable">
                <Button type="primary">
                  View Full Timetable <RightOutlined />
                </Button>
              </Link>
            }
            className="schedule-card"
          >
            {timetableLoading ? (
              <div style={{ padding: 24, textAlign: "center" }}>
                <Spin size="small" />
                <div style={{ marginTop: 8 }}>Loading schedule...</div>
              </div>
            ) : todaySchedule.length > 0 ? (
              <>
                {getTodayStats() && (
                  <div className="schedule-stats">
                    <div className="stats-card">
                      <div className="stats-title">Today you have:</div>
                      <div className="stats-content">
                        <div className="stat-item">
                          <div className="stat-value">
                            {getTodayStats().totalClasses}
                          </div>
                          <div className="stat-label">Classes</div>
                        </div>
                        <div className="stat-item">
                          <div className="stat-value">
                            {getTodayStats().totalHours}
                          </div>
                          <div className="stat-label">Hours</div>
                        </div>
                        <div className="stat-item">
                          <div className="stat-value">
                            {getTodayStats().totalStudents}
                          </div>
                          <div className="stat-label">Students</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <Table
                  dataSource={todaySchedule.map((entry, index) => ({
                    ...entry,
                    key: index,
                  }))}
                  columns={todayColumns}
                  pagination={false}
                  size="small"
                  className="today-schedule-table"
                  rowClassName={(record, index) =>
                    index % 2 === 0 ? "table-row-light" : "table-row-dark"
                  }
                />
              </>
            ) : (
              <div className="centered-content">
                <Empty
                  description={<span>No classes scheduled for today</span>}
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col span={24}>
          <Card
            className="timetable-card"
            title={<Title level={4}>Weekly Schedule Summary</Title>}
            extra={
              <Link to="/faculty/timetable">
                <Button type="primary">
                  View Full Schedule <RightOutlined />
                </Button>
              </Link>
            }
          >
            {timetableLoading ? (
              <div style={{ padding: 24, textAlign: "center" }}>
                <Spin size="small" />
                <div style={{ marginTop: 8 }}>Loading weekly overview...</div>
              </div>
            ) : (
              <Tabs defaultActiveKey="weekly" items={getWeeklyTabItems()} />
            )}
          </Card>
        </Col>
      </Row>

      <style jsx="true">{`
        .faculty-dashboard {
          padding: 24px;
        }

        .loading-container {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 80vh;
        }

        .loading-content {
          padding: 50px;
          background: rgba(0, 0, 0, 0.05);
          border-radius: 4px;
          width: 300px;
          height: 200px;
        }

        .faculty-info-card {
          background-color: #fafafa;
          border-radius: 12px;
        }

        .timetable-card {
          border-radius: 12px;
        }

        .schedule-card {
          margin-bottom: 16px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .schedule-card .ant-card-head {
          background-color: #f0f7ff;
          border-radius: 8px 8px 0 0;
        }

        .subject-cell {
          font-weight: 500;
        }

        .today-schedule .ant-card-head {
          background-color: #e6f7ff;
        }

        .centered-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .weekly-overview-list {
          padding-left: 0;
          list-style-type: none;
        }

        .weekly-overview-list li {
          padding: 8px 0;
          border-bottom: 1px solid #f0f0f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .weekly-overview-list li:last-child {
          border-bottom: none;
        }

        .room-info {
          color: #888;
          margin-left: auto;
        }

        .schedule-stats {
          margin-bottom: 20px;
          padding: 0 8px;
        }

        .stats-card {
          background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
          color: white;
          border-radius: 8px;
          padding: 16px;
          box-shadow: 0 4px 12px rgba(24, 144, 255, 0.15);
        }

        .stats-title {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 12px;
          text-align: center;
        }

        .stats-content {
          display: flex;
          justify-content: space-around;
        }

        .stat-item {
          text-align: center;
        }

        .stat-value {
          font-size: 24px;
          font-weight: bold;
        }

        .stat-label {
          font-size: 12px;
          opacity: 0.9;
        }

        .today-schedule-table .ant-table-thead > tr > th {
          background-color: #e6f7ff;
        }

        .table-row-light {
          background-color: #fafafa;
        }

        .table-row-dark {
          background-color: #f5f5f5;
        }
      `}</style>
    </div>
  );
};

export default FacultyDashboard;
