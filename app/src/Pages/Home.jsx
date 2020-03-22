import React, { useState, useEffect } from "react";
import { Tabs, Typography, Progress, Button, Upload, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { getUser } from "../utils/api";
import Skinview3d from 'react-skinview3d'
import {request} from "../utils/api";

const ipc = require('electron').ipcRenderer;

const { Title } = Typography;
const { TabPane } = Tabs;

const statusToLabel = {
    "init": "Launch",
    "downloading": "Downloading",
    "launched": "Launched",
    "launching": "Launching"
}

const getSkin = (skin) => {
    return `https://mc.uenify.com/skin/${skin}`
}


export default () => {
    const [state, setState] = useState({
        status: "init"
    });

    const [loading, setLoading] = useState(false);
    const [skin, setSkin] = useState(null)

    useEffect(() => {
        ipc.on('setState', (event, message) => {
            setState(message);
        })
    }, [])

    const beforeUpload = (file) => {
        const isPng = file.type === 'image/png';
        if (!isPng) {
            message.error('You can only upload PNG file!');
        }
        const isLt2M = file.size / 1024 / 1024 < 2;
        if (!isLt2M) {
            message.error('Image must smaller than 2MB!');
        }
        return isPng && isLt2M;
    }

    const handleChange = info => {
        if (info.file.status === 'uploading') {
            setLoading(true)
            return;
        }
        if (info.file.status === 'done') {
            setLoading(false);
            setSkin(info.file.response.skin)
        }
    };

    const saveSkin = () => {
        request({
            url: "api/user/changeSkin",
            method: "POST",
            data: {
                texture: skin
            }
        }).then(res => {
            if (res.data && res.data.success) {
                setSkin(null);
                const user = getUser();
                user.skin = res.data.user.skin;
                localStorage.setItem("user", JSON.stringify(user));
                message.success("Skin setted")
            }
        })
    }


    return (
        <div className="Home">
            <div className="header">
                <Title level={4}>Logged as {getUser().username}</Title>
            </div>
            <Tabs defaultActiveKey="1">
                <TabPane tab={
                    <span className="tab">
                        Home
                    </span>
                } key="1">
                    <div className="container launch">
                        <div className="launch-button">
                            <Button onClick={() => {
                                setState({
                                    status: "launching"
                                })
                                ipc.send("launch", getUser());
                            }} type="primary" loading={state.status === "downloading" || state.status === "launching"} disabled={state.status === "launched"} shape="round" size="large">
                                {statusToLabel[state.status]}
                            </Button>
                        </div>
                        {state.status === "downloading" ? <div className="progress">
                            <p>{state.name}</p>
                            <Progress status={state.percent === 100 ? "active" : null} percent={state.percent} status="active" />
                        </div> : null}
                    </div>
                </TabPane>
                <TabPane tab={
                    <span className="tab">
                        Profile
                    </span>
                } key="2">
                    <div className="container">
                        <div className="skin"><Skinview3d width="200" height="280" skinUrl={skin ? getSkin(skin.file) : getSkin(getUser().skin) } /></div>
                        {!skin ? <Upload name="file"
                            showUploadList={false}
                            customRequest={async (info) => {
                                const data = new FormData();
                                data.append("skin", info.file)
                                return request({
                                    url: "api/texture/uploadSkin",
                                    method: "POST",
                                    data
                                }).then(res => {
                                    if (res.data && res.data.success) {
                                        info.onSuccess(res.data)
                                    } else {
                                        message.error(res.data.message)
                                    }
                                })
                            }}
                            beforeUpload={beforeUpload}
                            onChange={handleChange}>
                            <Button disabled={!!skin}>
                                {skin ? "Uploaded" : <><UploadOutlined /> Click to Upload</>}
                            </Button>
                        </Upload> : null}
                        <br/>
                        {skin ? <Button onClick={saveSkin} type="primary">Set Skin</Button> : null}
                        <Button onClick={() => {
                            localStorage.clear();
                            window.location.reload();
                        }} type="danger">Logout</Button>
                    </div>
                </TabPane>
            </Tabs>
        </div>
    )
}