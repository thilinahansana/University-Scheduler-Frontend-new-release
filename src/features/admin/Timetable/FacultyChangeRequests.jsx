import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Card,
  Table,
  Tag,
  Button,
  Typography,
  Space,
  Tabs,
  Modal,
  Input,
  Form,
  message,
  Spin,
  Tooltip,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  CalendarOutlined,
  BookOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  RedoOutlined,
} from "@ant-design/icons";
import {
  getAdminChangeRequests,
  updateChangeRequestStatus,
  editTimetable,
} from "./timetable.api";
import ConflictDetailsModal from "./ConflictDetailsModal";
import {
  getDays,
  getPeriods,
  getSubjects,
  getSpaces,
  getTeachers,
} from "../DataManagement/data.api";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;

const FacultyChangeRequests = () => {
  const dispatch = useDispatch();
  const { days, periods, subjects, teachers, spaces } = useSelector(
    (state) => state.data
  );

  useEffect(() => {
    dispatch(getDays());
    dispatch(getPeriods());
    dispatch(getSubjects());
    dispatch(getSpaces());
    dispatch(getTeachers());
  }, [dispatch]);

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [activeTab, setActiveTab] = useState("pending");
  const [modalVisible, setModalVisible] = useState(false);
  const [currentRequest, setCurrentRequest] = useState(null);
  const [action, setAction] = useState("approve");
  const [form] = Form.useForm();
  const [processLoading, setProcessLoading] = useState(false);
  const [conflicts, setConflicts] = useState([]);
  const [conflictModalVisible, setConflictModalVisible] = useState(false);

  const fetchRequests = async (status = activeTab) => {
    setLoading(true);
    try {
      const response = await dispatch(getAdminChangeRequests(status)).unwrap();
      if (response && response.requests) {
        setRequests(response.requests);
      }
      console.log("Fetched requests:", response.requests);
    } catch (error) {
      console.error("Error fetching requests:", error);
      message.error("Failed to load faculty change requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [dispatch]);

  const handleTabChange = (key) => {
    setActiveTab(key);
    fetchRequests(key);
  };

  const handleAction = (record, actionType) => {
    setCurrentRequest(record);
    setAction(actionType);
    form.resetFields();
    setModalVisible(true);
  };

  const findTimetableEntry = (sessionId) => {
    return { session_id: sessionId };
  };

  const formatRequestForUpdate = (request) => {
    const timetableEntry = findTimetableEntry(request.session_id);

    let updatedActivity = {
      session_id: request.session_id,
    };

    switch (request.type) {
      case "substitute":
        updatedActivity = {
          ...updatedActivity,
          teacher: request.substitute_id,
          original_teacher: timetableEntry.teacher,
          is_substitute: true,
        };
        break;

      case "roomChange":
        if (request.room_details) {
          updatedActivity = {
            ...updatedActivity,
            room: request.room_details,
          };
        } else {
          const newRoom = request.room_id
            ? spaces?.find((room) => room._id === request.room_id)
            : spaces?.find((room) => room.name === request.new_room);

          updatedActivity = {
            ...updatedActivity,
            room: newRoom
              ? {
                  _id: newRoom._id,
                  name: newRoom.name,
                  long_name: newRoom.long_name,
                  code: newRoom.code,
                  capacity: newRoom.capacity,
                }
              : request.new_room,
          };
        }
        break;

      case "timeChange":
        const newDay = days?.find((day) => day.name === request.new_day);
        console.log("New Day:", newDay);
        let periodObjects = [];
        if (request.new_periods && Array.isArray(request.new_periods)) {
          periodObjects = request.new_periods.map((periodName) => {
            const period = periods?.find((p) => p.name === periodName);
            if (period) {
              return {
                _id: period._id,
                name: period.name,
                long_name: period.long_name,
                is_interval: period.is_interval || false,
                created_at: period.created_at,
                updated_at: period.updated_at,
                index: period.index || 0,
              };
            }
            return { name: periodName };
          });

          // Sort periods by index to maintain correct order
          periodObjects.sort((a, b) => {
            if (typeof a === "object" && typeof b === "object") {
              return (a.index || 0) - (b.index || 0);
            }
            return 0;
          });
        }

        updatedActivity = {
          ...updatedActivity,
          day: newDay
            ? {
                _id: newDay._id,
                name: newDay.name,
                long_name: newDay.long_name,
                created_at: newDay.created_at,
                updated_at: newDay.updated_at,
              }
            : request.new_day,
          period: periodObjects,
          duration: periodObjects.length,
        };
        break;

      default:
        break;
    }
    console.log("Formatted request for update:", updatedActivity);
    return updatedActivity;
  };

  const handleApproveWithConflictChecking = async (request, statusData) => {
    setProcessLoading(true);

    try {
      const updateData = formatRequestForUpdate(request);

      const response = await dispatch(
        updateChangeRequestStatus({
          requestId: request._id,
          statusData,
        })
      ).unwrap();

      if (response.conflicts) {
        setConflicts(response.conflicts);
        setConflictModalVisible(true);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error processing request:", error);

      if (error.conflicts) {
        setConflicts(error.conflicts);
        setConflictModalVisible(true);
      } else {
        message.error(
          `Failed to process request: ${error.message || "Unknown error"}`
        );
      }

      return false;
    } finally {
      setProcessLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setProcessLoading(true);

      const statusData = {
        status: action === "approve" ? "approved" : "rejected",
        admin_comments: values.adminComments || "",
      };

      if (action === "approve") {
        try {
          if (
            !currentRequest ||
            !currentRequest.session_id ||
            !currentRequest.timetable_id
          ) {
            console.error("Missing data:", {
              request: currentRequest,
              sessionId: currentRequest?.session_id,
              timetableId: currentRequest?.timetable_id,
            });
            Modal.error({
              title: "Error",
              content:
                "Missing required information (session ID or timetable ID)",
            });
            setProcessLoading(false);
            return;
          }

          let timetableData = {};

          switch (currentRequest.type) {
            case "substitute":
              timetableData = {
                teacher:
                  currentRequest.substitute_id || currentRequest.substitute,
                is_substitute: true,
                substitute_reason:
                  currentRequest.reason || "Faculty substitution request",
                original_teacher: currentRequest.original_teacher,
              };
              break;

            case "roomChange":
              if (currentRequest.room_details) {
                timetableData.room = currentRequest.room_details;
              } else if (currentRequest.room_id) {
                const room = spaces?.find(
                  (r) => r._id === currentRequest.room_id
                );
                if (room) {
                  timetableData.room = {
                    _id: room._id,
                    name: room.name,
                    long_name: room.long_name,
                    code: room.code,
                    capacity: room.capacity,
                  };
                } else {
                  timetableData.room = currentRequest.new_room;
                }
              } else {
                timetableData.room = currentRequest.new_room;
              }
              break;

            case "timeChange":
              // Get the full day object from state.data.days
              const dayObject = days?.find(
                (d) => d.name === currentRequest.new_day
              );

              if (!dayObject) {
                console.error(
                  `Day not found for name: ${currentRequest.new_day}`
                );
                message.error(
                  `Day information not found for ${currentRequest.new_day}`
                );
              }

              // Pass the complete day object structure instead of just the name
              timetableData = {
                day: dayObject
                  ? {
                      _id: dayObject._id,
                      name: dayObject.name,
                      long_name: dayObject.long_name,
                      created_at: dayObject.created_at,
                      updated_at: dayObject.updated_at,
                    }
                  : currentRequest.new_day,
                duration: currentRequest.new_periods?.length || 0,
              };

              console.log("Using day structure:", timetableData.day);

              // Handle periods array with exact structure needed
              if (
                currentRequest.new_periods &&
                Array.isArray(currentRequest.new_periods)
              ) {
                const formattedPeriods = [];

                // Get the full period objects from state.data.periods
                for (const periodName of currentRequest.new_periods) {
                  const periodObject = periods?.find(
                    (p) => p.name === periodName
                  );

                  if (periodObject) {
                    // Use the actual period object data from state
                    formattedPeriods.push({
                      _id: periodObject._id,
                      name: periodObject.name,
                      long_name: periodObject.long_name,
                      is_interval: periodObject.is_interval || false,
                      created_at: periodObject.created_at,
                      updated_at: periodObject.updated_at,
                      index:
                        periodObject.index ||
                        parseInt(periodObject.name.replace("P", "")) - 1 ||
                        formattedPeriods.length,
                    });
                  } else {
                    // Log warning and create placeholder with required structure
                    console.warn(`Period not found for name: ${periodName}`);
                    const now = new Date().toISOString();
                    formattedPeriods.push({
                      _id: `placeholder-${periodName}`,
                      name: periodName,
                      long_name: periodName,
                      is_interval: false,
                      created_at: now,
                      updated_at: now,
                      index: formattedPeriods.length,
                    });
                  }
                }

                // Sort periods by index to maintain correct order
                formattedPeriods.sort(
                  (a, b) => (a.index || 0) - (b.index || 0)
                );

                // Set the periods in the timetable data
                timetableData.period = formattedPeriods;

                console.log(
                  `Updating timetable with ${formattedPeriods.length} periods:`,
                  formattedPeriods
                );
              }

              // Handle room change if needed as part of the time change
              if (currentRequest.new_room) {
                // Get the full room object
                if (currentRequest.room_details) {
                  timetableData.room = currentRequest.room_details;
                } else if (currentRequest.room_id) {
                  const roomObject = spaces?.find(
                    (r) => r._id === currentRequest.room_id
                  );
                  if (roomObject) {
                    timetableData.room = {
                      _id: roomObject._id,
                      name: roomObject.name,
                      long_name: roomObject.long_name,
                      code: roomObject.code,
                      capacity: roomObject.capacity,
                    };
                  } else {
                    timetableData.room = currentRequest.new_room;
                  }
                } else {
                  timetableData.room = currentRequest.new_room;
                }
              }
              break;

            default:
              break;
          }

          console.log("Updating timetable with:", {
            timetableId: currentRequest.timetable_id,
            sessionId: currentRequest.session_id,
            timetableData,
          });
          console.log("Timetable data:", timetableData);
          if (Object.keys(timetableData).length > 0) {
            try {
              const editResponse = await dispatch(
                editTimetable({
                  timetableId: currentRequest.timetable_id,
                  sessionId: currentRequest.session_id,
                  timetableData,
                })
              ).unwrap();

              // Check if the edit response contains conflicts
              if (
                editResponse &&
                !editResponse.success &&
                editResponse.conflicts
              ) {
                console.log(
                  "Conflicts detected during edit:",
                  editResponse.conflicts
                );
                setConflicts(editResponse.conflicts);
                setConflictModalVisible(true);
                return;
              }

              const statusResponse = await dispatch(
                updateChangeRequestStatus({
                  requestId: currentRequest._id,
                  statusData,
                })
              ).unwrap();

              console.log("Status response:", statusResponse);

              // Check if status update has conflicts
              if (
                statusResponse &&
                !statusResponse.success &&
                statusResponse.conflicts
              ) {
                console.log(
                  "Conflicts detected during status update:",
                  statusResponse.conflicts
                );
                setConflicts(statusResponse.conflicts);
                setConflictModalVisible(true);
                return;
              }

              Modal.success({
                title: "Success",
                content: "Request approved and timetable updated successfully",
                onOk: () => {
                  setModalVisible(false);
                  fetchRequests(activeTab);
                },
              });
            } catch (editError) {
              console.error("Error during timetable update:", editError);
              if (editError.conflicts) {
                setConflicts(editError.conflicts);
                setConflictModalVisible(true);
                return;
              }

              Modal.error({
                title: "Error",
                content: `Failed to update timetable: ${
                  editError.message || "Unknown error"
                }`,
              });
            }
          } else {
            const statusResponse = await dispatch(
              updateChangeRequestStatus({
                requestId: currentRequest._id,
                statusData,
              })
            ).unwrap();

            // Check if status update has conflicts
            if (
              statusResponse &&
              !statusResponse.success &&
              statusResponse.conflicts
            ) {
              console.log(
                "Conflicts detected during status update:",
                statusResponse.conflicts
              );
              setConflicts(statusResponse.conflicts);
              setConflictModalVisible(true);
              return;
            }

            Modal.success({
              title: "Success",
              content: "Request approved successfully",
              onOk: () => {
                setModalVisible(false);
                fetchRequests(activeTab);
              },
            });
          }
        } catch (error) {
          console.error("Error approving request:", error);

          // Handle conflicts in the caught error
          if (error.conflicts) {
            console.log(
              "Conflicts detected in error response:",
              error.conflicts
            );
            setConflicts(error.conflicts);
            setConflictModalVisible(true);
            return;
          }

          Modal.error({
            title: "Error",
            content: `Failed to approve request: ${
              error.message || "Unknown error"
            }`,
          });
        }
      } else if (action === "reject") {
        try {
          const response = await dispatch(
            updateChangeRequestStatus({
              requestId: currentRequest._id,
              statusData,
            })
          ).unwrap();

          // Check for conflicts in the response
          if (response && !response.success && response.conflicts) {
            console.log(
              "Conflicts detected during rejection:",
              response.conflicts
            );
            setConflicts(response.conflicts);
            setConflictModalVisible(true);
            return;
          }

          message.success("Request has been rejected");
          setModalVisible(false);
          fetchRequests(activeTab);
        } catch (error) {
          console.error("Error rejecting request:", error);

          // Handle conflicts in the caught error
          if (error.conflicts) {
            console.log(
              "Conflicts detected in error response:",
              error.conflicts
            );
            setConflicts(error.conflicts);
            setConflictModalVisible(true);
            return;
          }

          message.error("Failed to reject request");
        }
      }
    } catch (validationError) {
      console.error("Validation error:", validationError);
    } finally {
      setProcessLoading(false);
    }
  };

  const handleConflictModalClose = () => {
    setConflictModalVisible(false);

    Modal.confirm({
      title: "Conflicts Detected",
      icon: <WarningOutlined />,
      content:
        "There are scheduling conflicts with this change. Do you want to reject the request?",
      okText: "Reject Request",
      cancelText: "Review Again",
      onOk: async () => {
        try {
          setProcessLoading(true);

          const statusData = {
            status: "rejected",
            admin_comments:
              form.getFieldValue("adminComments") ||
              "Request rejected due to scheduling conflicts.",
          };

          await dispatch(
            updateChangeRequestStatus({
              requestId: currentRequest._id,
              statusData,
            })
          ).unwrap();

          message.success("Request has been rejected due to conflicts");
          setModalVisible(false);
          fetchRequests(activeTab);
        } catch (error) {
          console.error("Error rejecting request:", error);
          message.error("Failed to reject request");
        } finally {
          setProcessLoading(false);
        }
      },
    });
  };

  const columns = [
    {
      title: "Faculty",
      dataIndex: "faculty_name",
      key: "faculty",
      render: (text) => (
        <span>
          <UserOutlined style={{ marginRight: 8 }} />
          {text}
        </span>
      ),
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      render: (type) => {
        let color;
        switch (type) {
          case "absence":
            color = "red";
            break;
          case "substitute":
            color = "blue";
            break;
          case "roomChange":
            color = "purple";
            break;
          case "timeChange":
            color = "orange";
            break;
          default:
            color = "default";
        }
        return (
          <Tag color={color}>
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </Tag>
        );
      },
    },
    {
      title: "Submitted",
      dataIndex: "submitted_at",
      key: "submitted_at",
      render: (date) => new Date(date).toLocaleString(),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        let color = "default";
        let icon = null;

        switch (status) {
          case "pending":
            color = "gold";
            icon = <ExclamationCircleOutlined />;
            break;
          case "approved":
            color = "green";
            icon = <CheckCircleOutlined />;
            break;
          case "rejected":
            color = "red";
            icon = <CloseCircleOutlined />;
            break;
          default:
            break;
        }

        return (
          <Tag color={color} icon={icon}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Tag>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          {record.status === "pending" && (
            <>
              <Button
                type="primary"
                size="small"
                onClick={() => handleAction(record, "approve")}
              >
                Approve
              </Button>
              <Button
                danger
                size="small"
                onClick={() => handleAction(record, "reject")}
              >
                Reject
              </Button>
            </>
          )}
          <Button
            type="default"
            size="small"
            onClick={() => {
              setCurrentRequest(record);
              setModalVisible(true);
              setAction("view");
            }}
          >
            View Details
          </Button>
        </Space>
      ),
    },
  ];

  const renderRequestDetails = () => {
    if (!currentRequest) return null;

    return (
      <div>
        <div style={{ marginBottom: 16 }}>
          <Text strong>
            <UserOutlined /> Faculty:
          </Text>{" "}
          {currentRequest.faculty_name}
        </div>

        <div style={{ marginBottom: 16 }}>
          <Text strong>
            <CalendarOutlined /> Request Type:
          </Text>{" "}
          {currentRequest.type.charAt(0).toUpperCase() +
            currentRequest.type.slice(1)}
        </div>

        {currentRequest.type === "substitute" && (
          <div style={{ marginBottom: 16 }}>
            <Text strong>
              <UserOutlined /> Requested Substitute:
            </Text>{" "}
            {currentRequest.substitute_name || "Not specified"}
          </div>
        )}

        {currentRequest.type === "roomChange" && currentRequest.new_room && (
          <div style={{ marginBottom: 16 }}>
            <Text strong>
              <RedoOutlined /> Requested New Room:
            </Text>{" "}
            {currentRequest.room_details?.long_name || currentRequest.new_room}
            {currentRequest.room_details?.capacity &&
              ` (Capacity: ${currentRequest.room_details.capacity})`}
          </div>
        )}

        {currentRequest.type === "timeChange" && (
          <>
            {currentRequest.new_day && (
              <div style={{ marginBottom: 16 }}>
                <Text strong>
                  <CalendarOutlined /> Requested New Day:
                </Text>{" "}
                {days?.find((d) => d.name === currentRequest.new_day)
                  ?.long_name || currentRequest.new_day}
              </div>
            )}
            {currentRequest.new_periods &&
              currentRequest.new_periods.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <Text strong>
                    <ClockCircleOutlined /> Requested New Periods:
                  </Text>{" "}
                  {Array.isArray(currentRequest.new_periods)
                    ? currentRequest.new_periods
                        .map((periodName) => {
                          const periodObj = periods?.find(
                            (p) => p.name === periodName
                          );
                          return periodObj
                            ? `${periodName} (${periodObj.long_name})`
                            : periodName;
                        })
                        .join(", ")
                    : currentRequest.new_periods}
                  <div>
                    <small>
                      Duration:{" "}
                      {Array.isArray(currentRequest.new_periods)
                        ? `${currentRequest.new_periods.length} period(s)`
                        : "Unknown"}
                    </small>
                  </div>
                </div>
              )}

            {currentRequest.new_room && (
              <div style={{ marginBottom: 16 }}>
                <Text strong>
                  <RedoOutlined /> Requested New Room:
                </Text>{" "}
                {currentRequest.room_details?.long_name ||
                  currentRequest.new_room}
                {currentRequest.room_details?.capacity &&
                  ` (Capacity: ${currentRequest.room_details.capacity})`}
              </div>
            )}
          </>
        )}

        <div style={{ marginBottom: 16 }}>
          <Text strong>Reason:</Text>
          <Paragraph>{currentRequest.reason}</Paragraph>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Text strong>Submitted:</Text>{" "}
          {new Date(currentRequest.submitted_at).toLocaleString()}
        </div>

        {currentRequest.status !== "pending" && (
          <div style={{ marginBottom: 16 }}>
            <Text strong>Status:</Text>{" "}
            {currentRequest.status === "approved" ? (
              <Tag color="green" icon={<CheckCircleOutlined />}>
                Approved
              </Tag>
            ) : (
              <Tag color="red" icon={<CloseCircleOutlined />}>
                Rejected
              </Tag>
            )}
          </div>
        )}

        {currentRequest.admin_comments && (
          <div style={{ marginBottom: 16 }}>
            <Text strong>Admin Comments:</Text>
            <Paragraph>{currentRequest.admin_comments}</Paragraph>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="faculty-change-requests">
      <Title level={2}>Faculty Schedule Change Requests</Title>
      <Paragraph>
        Review and manage requests from faculty for schedule changes.
      </Paragraph>

      <Tabs activeKey={activeTab} onChange={handleTabChange}>
        <TabPane
          tab={
            <span>
              Pending
              {requests.filter((r) => r.status === "pending").length > 0 && (
                <Tag color="gold" style={{ marginLeft: 8 }}>
                  {requests.filter((r) => r.status === "pending").length}
                </Tag>
              )}
            </span>
          }
          key="pending"
        >
          <Card>
            {loading ? (
              <div style={{ textAlign: "center", padding: 24 }}>
                <Spin size="large" />
              </div>
            ) : (
              <Table
                dataSource={requests}
                columns={columns}
                rowKey="_id"
                pagination={{ pageSize: 10 }}
              />
            )}
          </Card>
        </TabPane>

        <TabPane tab="Approved" key="approved">
          <Card>
            {loading ? (
              <div style={{ textAlign: "center", padding: 24 }}>
                <Spin size="large" />
              </div>
            ) : (
              <Table
                dataSource={requests}
                columns={columns}
                rowKey="_id"
                pagination={{ pageSize: 10 }}
              />
            )}
          </Card>
        </TabPane>

        <TabPane tab="Rejected" key="rejected">
          <Card>
            {loading ? (
              <div style={{ textAlign: "center", padding: 24 }}>
                <Spin size="large" />
              </div>
            ) : (
              <Table
                dataSource={requests}
                columns={columns}
                rowKey="_id"
                pagination={{ pageSize: 10 }}
              />
            )}
          </Card>
        </TabPane>
      </Tabs>

      <Modal
        title={
          action === "view"
            ? "Request Details"
            : action === "approve"
            ? "Approve Request"
            : "Reject Request"
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={
          action === "view"
            ? [
                <Button key="close" onClick={() => setModalVisible(false)}>
                  Close
                </Button>,
              ]
            : [
                <Button key="cancel" onClick={() => setModalVisible(false)}>
                  Cancel
                </Button>,
                <Button
                  key="submit"
                  type={action === "approve" ? "primary" : "danger"}
                  loading={processLoading}
                  onClick={handleSubmit}
                >
                  {action === "approve" ? "Approve" : "Reject"}
                </Button>,
              ]
        }
      >
        {renderRequestDetails()}

        {action !== "view" && (
          <Form form={form} layout="vertical">
            <Form.Item name="adminComments" label="Comments (optional)">
              <TextArea
                rows={4}
                placeholder="Add any comments about this decision..."
              />
            </Form.Item>
          </Form>
        )}
      </Modal>

      <ConflictDetailsModal
        visible={conflictModalVisible}
        onClose={handleConflictModalClose}
        conflicts={conflicts}
      />

      <style jsx="true">{`
        .faculty-change-requests {
          background-color: #fff;
          padding: 24px;
          border-radius: 15px;
        }
      `}</style>
    </div>
  );
};

export default FacultyChangeRequests;
