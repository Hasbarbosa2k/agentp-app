import React, { useState, useEffect } from 'react';
import { User, Bell, Shield, Database, Palette, Code, Users, Plus, Edit, Trash2, Crown, Eye, FileEdit, Ban, Unlock, UserCog, Key } from 'lucide-react';
import { Toggle } from '../components/Toggle';
import { UserManagementModal } from '../components/UserManagementModal';
import { GroupManagementModal } from '../components/GroupManagementModal';
import { ChangePasswordModal } from '../components/ChangePasswordModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useAuth } from '../contexts/AuthContext';
import { profileService, adminService, settingsService, groupService, type UserPreferences, type UserListItem, type Group } from '../services';
import { useToast } from '../contexts/ToastContext';

interface UserData {
  id: string;
  _id?: string;
  name?: string;
  displayName?: string;
  email: string;
  username?: string;
  role: 'admin' | 'editor' | 'viewer' | 'user';
  status?: 'active' | 'inactive';
  isActive?: boolean;
  isBlocked?: boolean;
  team?: string;
  lastLogin?: string;
  lastLoginAt?: string;
}

export const Settings: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const { showToast } = useToast();

  // Debug: Log do estado do usuário
  console.log('⚙️ Settings - Estado do usuário:', { 
    user: user ? 'logado' : 'não logado',
    role: user?.role,
    email: user?.email 
  });
  
  // Estados dos dados do perfil
  const [profileData, setProfileData] = useState({
    displayName: user?.displayName || '',
    email: user?.email || '',
    team: user?.team || ''
  });

  // Estado das preferências com valores padrão garantidos
  const defaultPreferences: UserPreferences = {
    notifications: {
      testCompletion: true,
      systemAlerts: true,
      emailReports: false
    },
    appearance: {
      theme: 'dark',
      accentColor: '#10b981'
    },
    advanced: {
      debugMode: false,
      detailedLogs: false
    }
  };

  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);

  // Estados de loading
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);

  // Função para garantir que as preferências tenham valores válidos
  const ensureValidPreferences = (prefs: Partial<UserPreferences>): UserPreferences => {
    return {
      notifications: {
        testCompletion: prefs.notifications?.testCompletion ?? defaultPreferences.notifications.testCompletion,
        systemAlerts: prefs.notifications?.systemAlerts ?? defaultPreferences.notifications.systemAlerts,
        emailReports: prefs.notifications?.emailReports ?? defaultPreferences.notifications.emailReports,
      },
      appearance: {
        theme: prefs.appearance?.theme ?? defaultPreferences.appearance.theme,
        accentColor: prefs.appearance?.accentColor ?? defaultPreferences.appearance.accentColor,
      },
      advanced: {
        debugMode: prefs.advanced?.debugMode ?? defaultPreferences.advanced.debugMode,
        detailedLogs: prefs.advanced?.detailedLogs ?? defaultPreferences.advanced.detailedLogs,
      }
    };
  };

  // Carregar preferências na inicialização
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        console.log('🔧 Tentando carregar preferências do usuário...');
        const prefs = await profileService.getPreferences();
        console.log('✅ Preferências carregadas:', prefs);
        // Garantir que as preferências são válidas antes de definir
        const validPrefs = ensureValidPreferences(prefs);
        console.log('🔒 Preferências validadas:', validPrefs);
        setPreferences(validPrefs);
      } catch (error) {
        console.error('❌ Error loading preferences:', error);
        // Don't show error toast to avoid overwhelming the user
        console.log('💡 Using default preferences due to error');
        // Garantir que temos valores padrão válidos
        setPreferences(defaultPreferences);
      } finally {
        setIsLoadingPreferences(false);
      }
    };

    if (user) {
      loadPreferences();
    } else {
      // Se não há usuário, não tentar carregar preferências
      setIsLoadingPreferences(false);
    }
  }, [user, showToast]);

  // Atualizar dados do perfil quando user muda
  useEffect(() => {
    if (user) {
      console.log('👤 Atualizando dados do perfil com:', user);
      setProfileData({
        displayName: user.displayName || '',
        email: user.email || '',
        team: user.team || ''
      });
    }
  }, [user]);

  // Função para atualizar preferências de notificação
  const updateNotificationPreference = async (key: keyof UserPreferences['notifications'], value: boolean) => {
    try {
      setIsSavingPreferences(true);
      
      // Garantir que temos preferências válidas antes de atualizar
      const currentPrefs = ensureValidPreferences(preferences);
      const updatedPrefs = {
        ...currentPrefs,
        notifications: {
          ...currentPrefs.notifications,
          [key]: value
        }
      };
      
      setPreferences(updatedPrefs);
      await profileService.updatePreferences({ notifications: { [key]: value } });
      showToast('Preferences updated', 'success');
    } catch (error) {
      console.error('Error updating notification preference:', error);
      showToast('Error updating preferences', 'error');
      // Reverter mudança local em caso de erro - usar valores seguros
      setPreferences(ensureValidPreferences(preferences));
    } finally {
      setIsSavingPreferences(false);
    }
  };

  // Função para atualizar preferências avançadas
  const updateAdvancedPreference = async (key: keyof UserPreferences['advanced'], value: boolean) => {
    try {
      setIsSavingPreferences(true);
      
      // Garantir que temos preferências válidas antes de atualizar
      const currentPrefs = ensureValidPreferences(preferences);
      const updatedPrefs = {
        ...currentPrefs,
        advanced: {
          ...currentPrefs.advanced,
          [key]: value
        }
      };
      
      setPreferences(updatedPrefs);
      await profileService.updatePreferences({ advanced: { [key]: value } });
      showToast('Preferences updated', 'success');
    } catch (error) {
      console.error('Error updating advanced preference:', error);
      showToast('Error updating preferences', 'error');
      // Reverter mudança local em caso de erro - usar valores seguros
      setPreferences(ensureValidPreferences(preferences));
    } finally {
      setIsSavingPreferences(false);
    }
  };

  // Função para atualizar perfil
  const updateProfile = async () => {
    try {
      setIsSavingProfile(true);
      console.log('🔧 Atualizando perfil:', profileData);
      await profileService.updateProfile(profileData);
      await refreshProfile();
      showToast('Profile updated successfully', 'success');
      console.log('✅ Perfil atualizado com sucesso');
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showToast(`Error updating profile: ${errorMessage}`, 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Estado do User Management
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [userModal, setUserModal] = useState({
    isOpen: false,
    mode: 'add' as 'add' | 'edit',
    user: null as UserData | null
  });
  const [passwordModal, setPasswordModal] = useState({
    isOpen: false,
    userId: '',
    userName: ''
  });
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning' as 'danger' | 'warning' | 'info' | 'success',
    onConfirm: () => {},
    isLoading: false
  });

  // Estado do Group Management
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [groupModal, setGroupModal] = useState({
    isOpen: false,
    mode: 'add' as 'add' | 'edit' | 'manage',
    group: null as Group | null
  });

  // Carregar utilizadores do backend
  useEffect(() => {
    const loadUsers = async () => {
      if (!user) {
        setIsLoadingUsers(false);
        return;
      }

      try {
        setIsLoadingUsers(true);
        const response = await adminService.getUsers({ limit: 100 });
        const mappedUsers = response.users.map((u: any) => ({
          id: u._id || u.id,
          _id: u._id,
          name: u.displayName || u.username || u.email,
          displayName: u.displayName,
          email: u.email,
          username: u.username,
          role: u.role === 'admin' ? 'admin' : (u.role || 'user'),
          status: u.isBlocked ? 'inactive' : (u.isActive ? 'active' : 'inactive'),
          isActive: u.isActive,
          isBlocked: u.isBlocked,
          team: u.team,
          lastLogin: u.lastLoginAt 
              ? new Date(u.lastLoginAt).toLocaleDateString('en-US', {
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
            : 'Never',
          lastLoginAt: u.lastLoginAt
        }));
        setUsers(mappedUsers);
      } catch (error) {
        console.error('Error loading users:', error);
        showToast('Error loading users', 'error');
      } finally {
        setIsLoadingUsers(false);
      }
    };

    loadUsers();
  }, [user, showToast]);

  // Carregar grupos do backend
  useEffect(() => {
    const loadGroups = async () => {
      if (!user) {
        setIsLoadingGroups(false);
        return;
      }

      try {
        setIsLoadingGroups(true);
        const response = await groupService.getGroups({ limit: 100 });
        setGroups(response.groups);
      } catch (error) {
        console.error('Error loading groups:', error);
        showToast('Error loading groups', 'error');
      } finally {
        setIsLoadingGroups(false);
      }
    };

    loadGroups();
  }, [user, showToast]);

  // Funções do User Management
  const handleAddUser = () => {
    setUserModal({ isOpen: true, mode: 'add', user: null });
  };

  const handleEditUser = (userToEdit: UserData) => {
    // Mapear dados do backend para o formato do modal
    const modalUser: UserData = {
      id: userToEdit.id || userToEdit._id || '',
      _id: userToEdit._id,
      name: userToEdit.name || userToEdit.displayName || userToEdit.email,
      displayName: userToEdit.displayName,
      email: userToEdit.email,
      username: userToEdit.username,
      role: userToEdit.role || 'user',
      status: userToEdit.status || (userToEdit.isActive && !userToEdit.isBlocked ? 'active' : 'inactive'),
      team: userToEdit.team
    };
    setUserModal({ isOpen: true, mode: 'edit', user: modalUser });
  };

  const handleChangePassword = (userId: string, userName: string) => {
    setPasswordModal({ isOpen: true, userId, userName });
  };

  const handleSavePassword = async (newPassword: string) => {
    await adminService.changeUserPassword(passwordModal.userId, newPassword);
      showToast('Password changed successfully', 'success');
  };

  const handleDeleteUser = (userId: string) => {
    const userToDelete = users.find(u => u.id === userId);
    if (!userToDelete) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Delete User',
      message: `Are you sure you want to delete the user "${userToDelete.name || userToDelete.email}"? This action cannot be undone.`,
      type: 'danger',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isLoading: true }));
        try {
          await adminService.deleteUser(userId);
          showToast('User deleted successfully', 'success');
          // Recarregar lista de utilizadores
          const response = await adminService.getUsers({ limit: 100 });
          const mappedUsers = response.users.map((u: any) => ({
            id: u._id || u.id,
            _id: u._id,
            name: u.displayName || u.username || u.email,
            displayName: u.displayName,
            email: u.email,
            username: u.username,
            role: u.role === 'admin' ? 'admin' : (u.role || 'user'),
            status: u.isBlocked ? 'inactive' : (u.isActive ? 'active' : 'inactive'),
            isActive: u.isActive,
            isBlocked: u.isBlocked,
            team: u.team,
            lastLogin: u.lastLoginAt 
              ? new Date(u.lastLoginAt).toLocaleDateString('en-US', { 
                  day: '2-digit', 
                  month: '2-digit', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'Never',
            lastLoginAt: u.lastLoginAt
          }));
          setUsers(mappedUsers);
          setConfirmDialog({ isOpen: false, title: '', message: '', type: 'warning', onConfirm: () => {}, isLoading: false });
        } catch (error) {
          console.error('Error deleting user:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          showToast(`Error deleting user: ${errorMessage}`, 'error');
          setConfirmDialog(prev => ({ ...prev, isLoading: false }));
        }
      },
      isLoading: false
    });
  };

  const handleBlockUser = (userId: string) => {
    const userToBlock = users.find(u => u.id === userId);
    if (!userToBlock) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Block User',
      message: `Are you sure you want to block the user "${userToBlock.name || userToBlock.email}"?`,
      type: 'warning',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isLoading: true }));
        try {
          await adminService.blockUser(userId);
          showToast('User blocked successfully', 'success');
          // Recarregar lista de utilizadores
          const response = await adminService.getUsers({ limit: 100 });
          const mappedUsers = response.users.map((u: any) => ({
            id: u._id || u.id,
            _id: u._id,
            name: u.displayName || u.username || u.email,
            displayName: u.displayName,
            email: u.email,
            username: u.username,
            role: u.role === 'admin' ? 'admin' : (u.role || 'user'),
            status: u.isBlocked ? 'inactive' : (u.isActive ? 'active' : 'inactive'),
            isActive: u.isActive,
            isBlocked: u.isBlocked,
            team: u.team,
            lastLogin: u.lastLoginAt 
              ? new Date(u.lastLoginAt).toLocaleDateString('en-US', { 
                  day: '2-digit', 
                  month: '2-digit', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'Never',
            lastLoginAt: u.lastLoginAt
          }));
          setUsers(mappedUsers);
          setConfirmDialog({ isOpen: false, title: '', message: '', type: 'warning', onConfirm: () => {}, isLoading: false });
        } catch (error) {
          console.error('Error blocking user:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          showToast(`Error blocking user: ${errorMessage}`, 'error');
          setConfirmDialog(prev => ({ ...prev, isLoading: false }));
        }
      },
      isLoading: false
    });
  };


  const handleUnblockUser = async (userId: string) => {
    try {
      await adminService.unblockUser(userId);
      showToast('User unblocked successfully', 'success');
      // Recarregar lista de utilizadores
      const response = await adminService.getUsers({ limit: 100 });
      const mappedUsers = response.users.map((u: any) => ({
        id: u._id || u.id,
        _id: u._id,
        name: u.displayName || u.username || u.email,
        displayName: u.displayName,
        email: u.email,
        username: u.username,
        role: u.role === 'admin' ? 'admin' : (u.role || 'user'),
        status: u.isBlocked ? 'inactive' : (u.isActive ? 'active' : 'inactive'),
        isActive: u.isActive,
        isBlocked: u.isBlocked,
        team: u.team,
        lastLogin: u.lastLoginAt 
              ? new Date(u.lastLoginAt).toLocaleDateString('en-US', {
              day: '2-digit', 
              month: '2-digit', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          : 'Never',
        lastLoginAt: u.lastLoginAt
      }));
      setUsers(mappedUsers);
    } catch (error) {
      console.error('Error unblocking user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showToast(`Error unblocking user: ${errorMessage}`, 'error');
    }
  };

  const handleSaveUser = async (userData: Omit<UserData, 'id' | 'lastLogin'> & { id?: string; password?: string }) => {
    try {
      if (userModal.mode === 'add') {
        // Criar novo utilizador
        // Mapear roles do frontend para backend (backend só aceita 'user' ou 'admin')
        const backendRole = userData.role === 'admin' ? 'admin' : 'user';
        
        await adminService.createUser({
          email: userData.email,
          password: userData.password || 'password123', // Password obrigatório
          displayName: userData.name || userData.email.split('@')[0],
          role: backendRole,
          team: userData.team || 'default-team'
        });
        showToast('User created successfully', 'success');
      } else {
        // Atualizar utilizador existente
        const userId = userData.id || userData._id;
        if (!userId) {
          showToast('User ID is required', 'error');
          return;
        }
        
        // Mapear roles do frontend para backend (backend só aceita 'user' ou 'admin')
        const backendRole = userData.role === 'admin' ? 'admin' : 'user';
        
        await adminService.updateUser(userId, {
          displayName: userData.name,
          email: userData.email,
          team: userData.team,
          role: backendRole,
          isActive: userData.status === 'active'
        });
        showToast('User updated successfully', 'success');
      }
      
      // Recarregar lista de utilizadores
      const response = await adminService.getUsers({ limit: 100 });
      const mappedUsers = response.users.map((u: any) => ({
        id: u._id || u.id,
        _id: u._id,
        name: u.displayName || u.username || u.email,
        displayName: u.displayName,
        email: u.email,
        username: u.username,
        role: u.role === 'admin' ? 'admin' : (u.role || 'user'),
        status: u.isBlocked ? 'inactive' : (u.isActive ? 'active' : 'inactive'),
        isActive: u.isActive,
        isBlocked: u.isBlocked,
        team: u.team,
        lastLogin: u.lastLoginAt 
              ? new Date(u.lastLoginAt).toLocaleDateString('en-US', {
              day: '2-digit', 
              month: '2-digit', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          : 'Never',
        lastLoginAt: u.lastLoginAt
      }));
      setUsers(mappedUsers);
      setUserModal({ isOpen: false, mode: 'add', user: null });
    } catch (error) {
      console.error('Error saving user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showToast(`Error saving user: ${errorMessage}`, 'error');
    }
  };

  // Funções do Group Management
  const handleAddGroup = () => {
    setGroupModal({ isOpen: true, mode: 'add', group: null });
  };

  const handleEditGroup = (group: Group) => {
    setGroupModal({ isOpen: true, mode: 'edit', group });
  };

  const handleManageGroupMembers = (group: Group) => {
    setGroupModal({ isOpen: true, mode: 'manage', group });
  };

  const handleDeleteGroup = (groupId: string) => {
    const groupToDelete = groups.find(g => (g._id || g.id) === groupId);
    if (!groupToDelete) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Delete Group',
      message: `Are you sure you want to delete the group "${groupToDelete.name}"? This action cannot be undone and all members will be removed from the group.`,
      type: 'danger',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isLoading: true }));
        try {
          await groupService.deleteGroup(groupId);
          showToast('Group deleted successfully', 'success');
          // Recarregar lista de grupos
          const response = await groupService.getGroups({ limit: 100 });
          setGroups(response.groups);
          setConfirmDialog({ isOpen: false, title: '', message: '', type: 'warning', onConfirm: () => {}, isLoading: false });
        } catch (error) {
          console.error('Error deleting group:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          showToast(`Error deleting group: ${errorMessage}`, 'error');
          setConfirmDialog(prev => ({ ...prev, isLoading: false }));
        }
      },
      isLoading: false
    });
  };

  const handleSaveGroup = async () => {
    // Recarregar lista de grupos
    try {
      const response = await groupService.getGroups({ limit: 100 });
      setGroups(response.groups);
    } catch (error) {
      console.error('Error reloading groups:', error);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown size={14} className="text-red-400" />;
      case 'editor': return <FileEdit size={14} className="text-blue-400" />;
      case 'viewer': return <Eye size={14} className="text-green-400" />;
      case 'user': return <User size={14} className="text-gray-400" />;
      default: return <User size={14} />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'text-red-400 bg-red-400/10';
      case 'editor': return 'text-blue-400 bg-blue-400/10';
      case 'viewer': return 'text-green-400 bg-green-400/10';
      case 'user': return 'text-gray-400 bg-gray-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  // Verificar se o usuário está logado
  if (!user) {
    return (
      <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400 text-sm sm:text-base">Configure your AgentP preferences</p>
        </div>
        <div className="text-center py-8 sm:py-12">
          <h3 className="text-lg font-semibold text-red-400 mb-2">Access Denied</h3>
          <p className="text-gray-500">You need to be logged in to access settings.</p>
        </div>
      </div>
    );
  }

  // Loading state enquanto carrega dados iniciais
  if (isLoadingPreferences) {
    return (
      <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400 text-sm sm:text-base">Configure your AgentP preferences</p>
        </div>
        <div className="text-center py-8 sm:py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-400 mb-2">Loading settings...</h3>
          <p className="text-gray-500">Please wait while we fetch your preferences.</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400 text-sm sm:text-base">Configure your AgentP preferences</p>
        </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8">
        {/* Profile Settings */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-colors">
          <div className="flex items-center space-x-3 mb-4">
            <User className="text-blue-400" size={24} />
            <h3 className="text-lg font-semibold text-white">Profile</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-2">Display Name</label>
              <input
                type="text"
                value={profileData.displayName}
                onChange={(e) => setProfileData(prev => ({ ...prev, displayName: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-400"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-2">Email</label>
              <input
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-400"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-2">Team</label>
              <input
                type="text"
                value={profileData.team}
                onChange={(e) => setProfileData(prev => ({ ...prev, team: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-400"
                placeholder="Your team name"
              />
            </div>
            <button
              onClick={updateProfile}
              disabled={isSavingProfile}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium"
            >
              {isSavingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-colors">
          <div className="flex items-center space-x-3 mb-4">
            <Bell className="text-yellow-400" size={24} />
            <h3 className="text-lg font-semibold text-white">Notifications</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Test Completion</span>
              <Toggle
                checked={preferences?.notifications?.testCompletion ?? defaultPreferences.notifications.testCompletion}
                onChange={(checked) => updateNotificationPreference('testCompletion', checked)}
                color="green"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">System Alerts</span>
              <Toggle
                checked={preferences?.notifications?.systemAlerts ?? defaultPreferences.notifications.systemAlerts}
                onChange={(checked) => updateNotificationPreference('systemAlerts', checked)}
                color="green"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Email Reports</span>
              <Toggle
                checked={preferences?.notifications?.emailReports ?? defaultPreferences.notifications.emailReports}
                onChange={(checked) => updateNotificationPreference('emailReports', checked)}
                color="blue"
              />
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-colors">
          <div className="flex items-center space-x-3 mb-4">
            <Shield className="text-green-400" size={24} />
            <h3 className="text-lg font-semibold text-white">Security</h3>
          </div>
          <div className="space-y-3">
            <button className="w-full px-4 py-3 bg-green-400/10 border border-green-400/20 rounded-lg text-green-400 hover:bg-green-400/20 transition-colors text-sm font-medium">
              Change Password
            </button>
            <button className="w-full px-4 py-3 bg-blue-400/10 border border-blue-400/20 rounded-lg text-blue-400 hover:bg-blue-400/20 transition-colors text-sm font-medium">
              Enable 2FA
            </button>
            <button className="w-full px-4 py-3 bg-red-400/10 border border-red-400/20 rounded-lg text-red-400 hover:bg-red-400/20 transition-colors text-sm font-medium">
              Logout All Devices
            </button>
          </div>
        </div>

        {/* Database */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-colors">
          <div className="flex items-center space-x-3 mb-4">
            <Database className="text-purple-400" size={24} />
            <h3 className="text-lg font-semibold text-white">Database</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-2">Backup Frequency</label>
              <select className="w-full px-3 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-400 transition-colors">
                <option>Daily</option>
                <option>Weekly</option>
                <option>Monthly</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-sm">Auto-cleanup old tests</span>
              <Toggle
                checked={true}
                onChange={(checked) => console.log('Database settings not implemented yet')}
                color="purple"
                disabled
              />
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-colors">
          <div className="flex items-center space-x-3 mb-4">
            <Palette className="text-pink-400" size={24} />
            <h3 className="text-lg font-semibold text-white">Appearance</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-2">Theme</label>
              <select className="w-full px-3 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-400 transition-colors">
                <option>Dark</option>
                <option>Light</option>
                <option>Auto</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-2">Accent Color</label>
              <div className="flex space-x-3">
                <div className="w-8 h-8 bg-green-400 rounded-full cursor-pointer border-2 border-white hover:scale-110 transition-transform"></div>
                <div className="w-8 h-8 bg-blue-400 rounded-full cursor-pointer hover:scale-110 transition-transform"></div>
                <div className="w-8 h-8 bg-purple-400 rounded-full cursor-pointer hover:scale-110 transition-transform"></div>
                <div className="w-8 h-8 bg-pink-400 rounded-full cursor-pointer hover:scale-110 transition-transform"></div>
              </div>
            </div>
          </div>
        </div>

        {/* User Management */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-colors xl:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Users className="text-cyan-400" size={24} />
                <h3 className="text-lg font-semibold text-white">User Management</h3>
              </div>
              {user?.role === 'admin' && (
                <button
                  onClick={handleAddUser}
                  className="flex items-center space-x-2 px-3 py-2 bg-cyan-400/10 border border-cyan-400/20 rounded-lg text-cyan-400 hover:bg-cyan-400/20 transition-colors text-sm font-medium"
                >
                  <Plus size={16} />
                  <span>Add User</span>
                </button>
              )}
            </div>
          
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {isLoadingUsers ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400 mb-2"></div>
                <p className="text-gray-400 text-sm">Loading users...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">No users found</p>
              </div>
            ) : (
              users.map((userItem) => (
                <div key={userItem.id} className="bg-gray-700/50 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-400/20 to-blue-400/20 rounded-full flex items-center justify-center">
                      <User size={18} className="text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-white font-medium truncate">{userItem.name || userItem.displayName || userItem.email}</h4>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(userItem.role)}`}>
                          {getRoleIcon(userItem.role)}
                          <span className="ml-1">{userItem.role}</span>
                        </span>
                        {userItem.isBlocked ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-red-400 bg-red-400/10">
                            <Ban size={12} className="mr-1" />
                            Blocked
                          </span>
                        ) : (
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            userItem.status === 'active' || userItem.isActive
                              ? 'text-green-400 bg-green-400/10' 
                              : 'text-gray-400 bg-gray-400/10'
                          }`}>
                            {userItem.status || (userItem.isActive ? 'active' : 'inactive')}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm truncate">{userItem.email}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                        {userItem.team && <span>Team: {userItem.team}</span>}
                        <span>Last login: {userItem.lastLogin || 'Never'}</span>
                      </div>
                    </div>
                  </div>
                  {user?.role === 'admin' && (
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleEditUser(userItem)}
                        className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                        title="Edit User"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleChangePassword(userItem.id, userItem.name || userItem.email)}
                        className="p-2 text-gray-400 hover:text-green-400 hover:bg-green-400/10 rounded-lg transition-colors"
                        title="Change Password"
                      >
                        <Key size={16} />
                      </button>
                      {userItem.isBlocked ? (
                        <button
                          onClick={() => handleUnblockUser(userItem.id)}
                          className="p-2 text-gray-400 hover:text-green-400 hover:bg-green-400/10 rounded-lg transition-colors"
                          title="Unblock User"
                        >
                          <Unlock size={16} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBlockUser(userItem.id)}
                          className="p-2 text-gray-400 hover:text-orange-400 hover:bg-orange-400/10 rounded-lg transition-colors"
                          title="Block User"
                        >
                          <Ban size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteUser(userItem.id)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                        title="Delete User"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="flex items-center justify-between text-sm text-gray-400">
                <span>{users.length} total users</span>
                <span>{users.filter(u => (u.status === 'active' || u.isActive) && !u.isBlocked).length} active</span>
                {users.filter(u => u.isBlocked).length > 0 && (
                  <span className="text-red-400">{users.filter(u => u.isBlocked).length} blocked</span>
                )}
              </div>
            </div>
          </div>

        {/* Advanced */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-colors">
          <div className="flex items-center space-x-3 mb-4">
            <Code className="text-orange-400" size={24} />
            <h3 className="text-lg font-semibold text-white">Advanced</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-sm">Debug Mode</span>
              <Toggle
                checked={preferences?.advanced?.debugMode ?? defaultPreferences.advanced.debugMode}
                onChange={(checked) => updateAdvancedPreference('debugMode', checked)}
                color="orange"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-sm">Detailed Logs</span>
              <Toggle
                checked={preferences?.advanced?.detailedLogs ?? defaultPreferences.advanced.detailedLogs}
                onChange={(checked) => updateAdvancedPreference('detailedLogs', checked)}
                color="orange"
              />
            </div>
            <button className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-600 transition-colors text-sm font-medium">
              Export Settings
            </button>
          </div>
        </div>
      </div>

        {/* Group Management */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-colors xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <UserCog className="text-purple-400" size={24} />
              <h3 className="text-lg font-semibold text-white">Group Management</h3>
            </div>
            {user?.role === 'admin' && (
              <button
                onClick={handleAddGroup}
                className="flex items-center space-x-2 px-3 py-2 bg-purple-400/10 border border-purple-400/20 rounded-lg text-purple-400 hover:bg-purple-400/20 transition-colors text-sm font-medium"
              >
                <Plus size={16} />
                <span>Add Group</span>
              </button>
            )}
          </div>
          
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {isLoadingGroups ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400 mb-2"></div>
                <p className="text-gray-400 text-sm">Loading groups...</p>
              </div>
            ) : groups.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">No groups found</p>
              </div>
            ) : (
              groups.map((groupItem) => (
                <div key={groupItem._id || groupItem.id} className="bg-gray-700/50 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${groupItem.color}20` }}
                    >
                      <Users size={18} style={{ color: groupItem.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-white font-medium truncate">{groupItem.name}</h4>
                        {!groupItem.isActive && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-gray-400 bg-gray-400/10">
                            Inactive
                          </span>
                        )}
                      </div>
                      {groupItem.description && (
                        <p className="text-gray-400 text-sm truncate">{groupItem.description}</p>
                      )}
                      <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                        <span>{groupItem.members?.length || 0} members</span>
                        {groupItem.createdBy && (
                          <span>Created by: {groupItem.createdBy.displayName || groupItem.createdBy.username || groupItem.createdBy.email}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {user?.role === 'admin' && (
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleManageGroupMembers(groupItem)}
                        className="p-2 text-gray-400 hover:text-purple-400 hover:bg-purple-400/10 rounded-lg transition-colors"
                        title="Manage Members"
                      >
                        <UserCog size={16} />
                      </button>
                      <button
                        onClick={() => handleEditGroup(groupItem)}
                        className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                        title="Edit Group"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(groupItem._id || groupItem.id || '')}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                        title="Delete Group"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="flex items-center justify-between text-sm text-gray-400">
              <span>{groups.length} total groups</span>
              <span>{groups.filter(g => g.isActive).length} active</span>
            </div>
          </div>
        </div>

      {/* User Management Modal */}
      <UserManagementModal
        isOpen={userModal.isOpen}
        onClose={() => setUserModal({ isOpen: false, mode: 'add', user: null })}
        onSave={handleSaveUser}
        user={userModal.user}
        mode={userModal.mode}
      />

      {/* Group Management Modal */}
      <GroupManagementModal
        isOpen={groupModal.isOpen}
        onClose={() => setGroupModal({ isOpen: false, mode: 'add', group: null })}
        onSave={handleSaveGroup}
        group={groupModal.group}
        mode={groupModal.mode}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={passwordModal.isOpen}
        onClose={() => setPasswordModal({ isOpen: false, userId: '', userName: '' })}
        onSave={handleSavePassword}
        userName={passwordModal.userName}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, title: '', message: '', type: 'warning', onConfirm: () => {}, isLoading: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        isLoading={confirmDialog.isLoading}
        confirmText="Confirm"
        cancelText="Cancel"
      />
      </div>
    </ErrorBoundary>
  );
};