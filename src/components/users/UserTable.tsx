import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { user } from "@/types";
import CustomPagination from "@/components/global/CustomPagination";

// ?page=${pageNum}&limit=10
interface Props {
  role: string;
  loading: boolean;
  setDeleteId: (id: string) => void;
  setIsDeleteOpen: (open: boolean) => void;
  setEditingUser: (user: user | null) => void;
  setIsFormOpen: (open: boolean) => void;
  users: user[];
  pageNum: number;
  setPageNum: (page: number) => void;
  totalPages: number;
}

const UserTable = ({
  role,
  loading,
  setDeleteId,
  setIsDeleteOpen,
  setEditingUser,
  setIsFormOpen,
  pageNum,
  setPageNum,
  users,
  totalPages,
}: Props) => {
  const handleEdit = (user: user) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };
  const getAvatarColor = (name: string) => {
    const colors = ["bg-indigo-100 text-indigo-700", "bg-purple-100 text-purple-700", "bg-blue-100 text-blue-700", "bg-emerald-100 text-emerald-700", "bg-orange-100 text-orange-700", "bg-pink-100 text-pink-700"];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="edu-card overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-50 border-b border-slate-100">
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider py-4">Name</TableHead>
            <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</TableHead>
            {role === "teacher" && <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subjects</TableHead>}
            {role === "student" && <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">Class</TableHead>}
            {role === "parent" && <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">Children</TableHead>}
            <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-slate-50">
          {loading ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
              </TableCell>
            </TableRow>
          ) : users.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="h-24 text-center text-muted-foreground"
              >
                No {role}s found.
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user._id} className="hover:bg-slate-50/50 transition-colors group">
                <TableCell className="py-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${getAvatarColor(user.name)}`}>
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{user.name}</p>
                      <p className="text-xs text-slate-500 capitalize">{user.role}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-slate-600 font-medium">{user.email}</TableCell>
                {role === "teacher" && (
                  <TableCell>
                    {user.teacherSubject?.length ? (
                      <div className="flex gap-1">
                        {user.teacherSubject.map((subject: any) => (
                          <Badge variant="outline" key={subject._id}>
                            {subject.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic text-sm">
                        Unassigned
                      </span>
                    )}
                  </TableCell>
                )}
                {role === "student" && (
                  <TableCell>
                    {user.studentClass?._id ? (
                      <Badge variant="outline">{user.studentClass.name}</Badge>
                    ) : (
                      <span className="text-muted-foreground italic text-sm">
                        Unassigned
                      </span>
                    )}
                  </TableCell>
                )}
                {role === "parent" && (
                  <TableCell>
                    {user.children?.length ? (
                      <div className="flex gap-1 flex-wrap">
                        {user.children.map((child: any) => (
                          <Badge variant="secondary" key={child._id}>
                            {child.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic text-sm">
                        No children assigned
                      </span>
                    )}
                  </TableCell>
                )}
                <TableCell className="text-right py-4">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full"
                      onClick={() => handleEdit(user)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                      onClick={() => {
                        setDeleteId(user._id);
                        setIsDeleteOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {users.length > 10 && (
        <CustomPagination
          loading={loading}
          page={pageNum}
          setPage={setPageNum}
          totalPages={totalPages}
        />
      )}
    </div>
  );
};

export default UserTable;
