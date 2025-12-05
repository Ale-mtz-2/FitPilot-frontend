import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { UserCircleIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';

export function UserMenu() {
  const { t } = useTranslation(['auth', 'common']);
  const { user, logout } = useAuthStore();

  if (!user) return null;

  return (
    <Menu as="div" className="relative">
      <Menu.Button className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors">
        <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold text-sm">
          {user.full_name.charAt(0).toUpperCase()}
        </div>
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
          <p className="text-xs text-gray-500 capitalize">{t(`common:roles.${user.role}`)}</p>
        </div>
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
            <p className="text-sm text-gray-500 truncate">{user.email}</p>
          </div>

          <div className="py-1">
            <Menu.Item>
              {({ active }) => (
                <button
                  className={`${
                    active ? 'bg-gray-100' : ''
                  } flex w-full items-center px-4 py-2 text-sm text-gray-700`}
                >
                  <UserCircleIcon className="mr-3 h-5 w-5 text-gray-400" />
                  {t('auth:profile.title')}
                </button>
              )}
            </Menu.Item>

            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={logout}
                  className={`${
                    active ? 'bg-gray-100' : ''
                  } flex w-full items-center px-4 py-2 text-sm text-red-600`}
                >
                  <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 text-red-400" />
                  {t('auth:logout.button')}
                </button>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
