import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Layout, Menu, Button, Avatar, Dropdown, Space, Badge } from "antd";
import {
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  UserOutlined,
  CalendarOutlined,
  SettingOutlined,
  LogoutOutlined,
  BellOutlined,
  DashboardOutlined,
} from "@ant-design/icons";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { logout } from "../../auth/authSlice";
import "./FacultyLayout.css";

const { Header, Sider, Content } = Layout;

const FacultyLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  // Extract first letter of first and last name for avatar
  const getInitials = () => {
    if (user && user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    return "U";
  };

  // Menu items for the sidebar
  const menuItems = [
    {
      key: "/faculty/dashboard",
      icon: <DashboardOutlined />,
      label: "Dashboard",
      onClick: () => navigate("/faculty/dashboard"),
    },
    {
      key: "/faculty/timetable",
      icon: <CalendarOutlined />,
      label: "Your Timetable",
      onClick: () => navigate("/faculty/timetable"),
    },
    {
      key: "/faculty/settings",
      icon: <SettingOutlined />,
      label: "Settings",
      onClick: () => navigate("/faculty/settings"),
    },
  ];

  // User menu for the dropdown
  const userMenu = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Profile",
      onClick: () => navigate("/faculty/profile"),
    },
    {
      key: "settings",
      icon: <SettingOutlined />,
      label: "Settings",
      onClick: () => navigate("/faculty/settings"),
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Logout",
      danger: true,
      onClick: handleLogout,
    },
  ];

  // Find the active menu item based on current location
  const activeMenuItem =
    menuItems.find((item) => location.pathname.startsWith(item.key))?.key ||
    "/faculty/dashboard";

  return (
    <Layout className="faculty-layout">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        className="faculty-sider"
      >
        <div className="logo">{collapsed ? "US" : "University Scheduler"}</div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[activeMenuItem]}
          items={menuItems}
        />
      </Sider>
      <Layout className="site-layout">
        <Header className="faculty-header">
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className="trigger-button"
          />
          <div className="header-right">
            <Badge count={0} className="notification-badge">
              <Button type="text" icon={<BellOutlined />} />
            </Badge>
            <Dropdown menu={{ items: userMenu }} placement="bottomRight" arrow>
              <Space className="user-dropdown">
                <Avatar className="avatar">{getInitials()}</Avatar>
                {!collapsed && (
                  <span className="username">
                    {user?.first_name} {user?.last_name}
                  </span>
                )}
              </Space>
            </Dropdown>
          </div>
        </Header>
        <Content className="faculty-content">
          <Outlet />
        </Content>
      </Layout>
      <style jsx="true">{`
        .faculty-layout {
          min-height: 100vh;
        }

        .faculty-sider {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          z-index: 10;
        }

        .logo {
          height: 32px;
          margin: 16px;
          color: white;
          font-weight: bold;
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .faculty-header {
          padding: 0 16px;
          background: #fff;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 1;
        }

        .header-right {
          display: flex;
          align-items: center;
        }

        .notification-badge {
          margin-right: 16px;
        }

        .user-dropdown {
          cursor: pointer;
          padding: 0 8px;
        }

        .avatar {
          background-color: #1890ff;
        }

        .username {
          margin-left: 8px;
        }

        .trigger-button {
          font-size: 18px;
          padding: 0 24px;
        }

        .faculty-content {
          margin: 24px 16px;
          padding: 24px;
          background: #fff;
          min-height: 280px;
          border-radius: 4px;
          overflow: auto;
        }
      `}</style>
    </Layout>
  );
};

export default FacultyLayout;
