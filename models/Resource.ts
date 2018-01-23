import * as orm from "typeorm";
import WebCourse from "./WebCourse";
import ResourceType from "./enums/ResourceType";

@orm.Entity()
export default class Resource {
    public constructor(init: Partial<Resource>) {
        Object.assign(this, init);
    }

    @orm.PrimaryGeneratedColumn()
    public id: number;

    @orm.Column({ nullable: false })
    public type: ResourceType;

    @orm.ManyToOne(t => WebCourse, c => c.resources, { nullable: false })
    public course: WebCourse;

    @orm.Column({ nullable: false })
    public link: string;
}
