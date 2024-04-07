import { Injectable, OnDestroy } from "@angular/core";

import { Socket } from "ngx-socket-io";

import { BehaviorSubject, Subscription } from "rxjs";

import { ICommandResult } from "../../models/commandResult";
import { IFeatureParameters } from "../../models/featureParameters";

@Injectable({ providedIn: "root" })
export class CommandCenterService implements OnDestroy {
	public $isConnected = new BehaviorSubject<boolean>(false);

	private $moduleConnected = new Map<number, BehaviorSubject<boolean>>();
	private subscriptions: Subscription[] = [];

	constructor (private readonly socket: Socket) {
		this.subscriptions.push(
			this.socket.fromEvent("connect").subscribe(() => this.$isConnected.next(true)),

			this.socket.fromEvent("disconnect").subscribe(() => {
				this.$isConnected.next(false);
				this.$moduleConnected.forEach(subject => subject.next(false));
			}),

			this.socket.fromEvent<ICommandResult>("COMMAND_RESULT").subscribe(this.handleCommandResult.bind(this)),

			this.socket.fromEvent<{ idModule: number, isConnected: boolean }>("MODULE_CONNECTION").subscribe(data => {
				const subject = this.$moduleConnected.get(data.idModule);
				subject?.next(data.isConnected);
			})
		);
	}

	public ngOnDestroy (): void {
		this.subscriptions.forEach(subscription => subscription.unsubscribe());
	}

	public $isModuleConnected (moduleId: number): BehaviorSubject<boolean> {
		if (!this.$moduleConnected.has(moduleId))
			this.$moduleConnected.set(moduleId, new BehaviorSubject<boolean>(false));

		return this.$moduleConnected.get(moduleId)!;
	}

	public sendCommandToModule (idModule: number, featureIdentifier: string, parameters?: IFeatureParameters): number {
		const sentAt = Date.now();
		this.socket.emit("COMMAND", {
			idModule, featureIdentifier, parameters, sentAt
		});

		return sentAt;
	}

	private handleCommandResult (data: ICommandResult): void {
		// TODO
		console.log(data);
	}
}