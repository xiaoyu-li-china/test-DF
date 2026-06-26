import { Outlet, NavLink, useLocation } from 'react-router-dom';
import styles from './Layout.module.css';

const menuItems = [
  { path: '/dashboard', label: '数据看板', icon: '📊' },
  { path: '/ranking', label: '门店排名', icon: '🏆' },
  { path: '/reports', label: '报表导出', icon: '📄' },
];

export default function Layout() {
  const location = useLocation();

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🧋</span>
          <span className={styles.logoText}>巡检管理系统</span>
        </div>
        <nav className={styles.nav}>
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className={styles.main}>
        <header className={styles.header}>
          <h1 className={styles.pageTitle}>
            {menuItems.find((m) => m.path === location.pathname)?.label || '数据看板'}
          </h1>
          <div className={styles.userInfo}>
            <span>管理员</span>
          </div>
        </header>
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
