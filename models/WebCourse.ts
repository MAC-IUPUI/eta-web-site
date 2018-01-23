import * as orm from "typeorm";
import CourseTitle from "./enums/CourseTitle";
import CourseSection from "./enums/CourseSection";
import Resource from "./Resource";

@orm.Entity()
export default class WebCourse {
    public constructor(init: Partial<WebCourse>) {
        Object.assign(this, init);
    }

    @orm.PrimaryGeneratedColumn()
    public id: number;

    @orm.Column({ nullable: false })
    public subject: string;

    @orm.Column({ nullable: false })
    public number: string;

    @orm.Column({ nullable: false, name: "full_name" })
    public name: string;

    @orm.Column({ nullable: false })
    public section: CourseSection;

    @orm.OneToMany(t => Resource, r => r.course)
    public resources?: Resource[];
}
