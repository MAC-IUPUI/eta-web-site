import * as orm from "typeorm";
import EventType from "./enums/EventType";

@orm.Entity()
export default class Event {
    public constructor(init: Partial<Event>) {
        Object.assign(this, init);
    }

    @orm.PrimaryGeneratedColumn()
    public id: number;

    @orm.Column({ nullable: false })
    public title: string;

    @orm.Column()
    public description: string;

    @orm.Column({ type: "timestamp without time zone", nullable: false })
    public date: Date;

    @orm.Column({ type: "timestamp with time zone", nullable: false })
    public start: Date;

    @orm.Column({ type: "timestamp with time zone", nullable: false })
    public end: Date;

    @orm.Column()
    public type: EventType;
}
