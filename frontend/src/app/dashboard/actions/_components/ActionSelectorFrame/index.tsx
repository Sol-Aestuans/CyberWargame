"use client";
import { io, Socket } from "socket.io-client";
import { useState, useEffect, useCallback, useContext } from "react";
import { Action, PendingAction, User, Modifiers } from "@/types";
import ActionButton from "./ActionButton";
import { getActions, getGraphData, getModifiers } from "@/actions";
import Timer from "./Timer";
import { TargetContext } from "../TargetContext";

const STRAPI_URL = process.env.STRAPI_URL || "http://localhost:1337";

interface ActionSelectorFrameProps {
    readonly socket: Socket | null;
    readonly user: User;
}

export default function ActionSelectorFrame({ socket, user }: Readonly<ActionSelectorFrameProps>) {
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [actions, setActions] = useState<Action[]>([]);
    const [butttonDisabled, setButtonDisabled] = useState(false);
    const [endTime, setEndTime] = useState<Date | null>(null);
    const [modifiers, setModifiers] = useState<Modifiers>({ offense: 0, defense: 0, buff: 0 });
    const {setTeamGraph, setOpponentGraph} = useContext(TargetContext);

    const refresh = useCallback(() => {
        console.log("Refreshing action selector");
        // Get the list of actions from the server
        getActions().then((res) => {
            if (res) {
                setActions(res.actions);
                setButtonDisabled(res.endTime !== null);
                if (res.endTime) setEndTime(new Date(res.endTime));
            } else {
                setError("Error fetching actions");
                setButtonDisabled(true);
            }
        });

        // Get modifiers from the server
        getModifiers().then((res) => {
            if (res) {
                setModifiers(res);
            } else {
                setError("Error fetching modifiers");
            }
        });
        setLoading(false);
        setEndTime(null);

        // Get graph data from the server
        getGraphData("team").then((res) => {
            if (res) {
                setTeamGraph(res);
            } else {
                setError("Error fetching graph data");
            }
        });
        getGraphData("opponent").then((res) => {
            if (res) {
                setOpponentGraph(res);
            } else {
                setError("Error fetching graph data");
            }
        });
    }, [setTeamGraph, setOpponentGraph]);

    useEffect(() => {
        console.log("ActionSelectorFrame mounted");
        refresh();
    }, [refresh]);

    useEffect(() => {
        console.log("socket changed");
        // re-enable buttons when action is complete
        if (socket) socket.on('actionComplete', () => refresh());

        // connection error handling
        if (socket) socket.on('connect_error', () => {
            setError("Error connecting to socket server");
            setButtonDisabled(true);
        });

        // error handling
        if (socket) socket.on('error', (error: string) => {
            setError(error);
            setButtonDisabled(true);
        });

        // get rid of the error message when the connection is re-established
        if (socket) socket.on('connect', () => {
            setError(null);
            setButtonDisabled(false);
            refresh();
        });
    }, [socket, refresh]);

    function handleActionClick(action: Action, nodeId?: number, edgeId?: number) {
        const pendingAction = {
            user: user.username,
            action: action.id,
            nodeId: nodeId,
            edgeId: edgeId
        };

        if (socket) {
            socket.emit('startAction', pendingAction);
            setButtonDisabled(true);
        }

        setEndTime(new Date(Date.now() + action.duration * 60 * 1000));
    }

    return (
        <div>
            <h3>Perform Action</h3>
            {loading && <p>Loading...</p>}
            {error && <p>{error}</p>}
            {actions.map((action, index) => (
                <ActionButton
                    key={index}
                    action={action}
                    onClick={handleActionClick}
                    disabled={butttonDisabled}
                    modifiers={modifiers}
                    setButtonDisabled={setButtonDisabled}
                />
            ))}
            {endTime && <Timer time={endTime} />}
        </div>
    );
}