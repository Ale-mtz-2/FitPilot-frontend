import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

export function MealPlansLayout() {
    const location = useLocation();

    const navItems = [
        { name: 'Crear Menu', href: '/nutrition/meal-plans/create-menu' },
        { name: 'Menus Reutilizables', href: '/nutrition/meal-plans/reusable-menus' },
        { name: 'Menus sin terminar', href: '/nutrition/meal-plans/drafts' },
    ];

    return (
        <div className="flex flex-col h-full">
            <div className="bg-white border-b border-gray-200 px-6 py-2">
                <nav className="flex space-x-8">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.href}
                            to={item.href}
                            className={({ isActive }) => `
                relative py-3 text-sm font-medium transition-colors duration-200
                ${isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}
              `}
                        >
                            {item.name}
                            {location.pathname.startsWith(item.href) && (
                                <motion.div
                                    layoutId="mealPlansNavUnderline"
                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                                    initial={false}
                                />
                            )}
                        </NavLink>
                    ))}
                </nav>
            </div>

            <div className="flex-1 overflow-auto">
                <Outlet />
            </div>
        </div>
    );
}
