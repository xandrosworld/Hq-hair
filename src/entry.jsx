import React,{Suspense,lazy,Component} from 'react';
import {createRoot} from 'react-dom/client';
import {WorkspaceGate} from './workspace-gate.jsx';
import {isWorkspace} from './workspace-api.js';
import '@fontsource/be-vietnam-pro/400.css';
import '@fontsource/be-vietnam-pro/500.css';
import '@fontsource/be-vietnam-pro/600.css';
import '@fontsource/be-vietnam-pro/700.css';
const App=lazy(()=>import('./main.jsx'));
class LoadBoundary extends Component{
 state={error:false};
 static getDerivedStateFromError(){return {error:true}}
 render(){return this.state.error?<div className="hq-auth-loading"><p>Không tải được giao diện. Vui lòng kiểm tra kết nối rồi tải lại.</p><button className="hq-login-submit" style={{width:'auto'}} onClick={()=>location.reload()}>Tải lại</button></div>:this.props.children}
}
const content=(user,onLogout)=><LoadBoundary><Suspense fallback={<div className="hq-auth-loading">Đang tải không gian làm việc…</div>}><App key={user?.id} {...(user?{user,onLogout}:{})}/></Suspense></LoadBoundary>;
createRoot(document.getElementById('root')).render(isWorkspace?<WorkspaceGate>{content}</WorkspaceGate>:content());
